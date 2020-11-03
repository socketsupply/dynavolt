const { queryParser, toJSON, toDynamoJSON } = require('./util')

class Table {
  constructor (DynamoDB, dbOpts = {}, opts = {}) {
    this.disableATD = opts.disableATD
    this.db = new DynamoDB({ ...dbOpts, ...opts })
  }

  createKeyProperties (hash, range) {
    const o = {
      [this.hashKey]: { [this.hashType]: hash }
    }

    if (range) {
      o[this.rangeKey] = { [this.rangeType]: range }
    }

    return o
  }

  async setTTL (AttributeName = 'ttl', Enabled = true) {
    if (!this.meta && this.meta.TableName) {
      return { err: new Error('No table open') }
    }

    let data = {}
    let isEnabled = false
    const TableName = this.meta.TableName

    try {
      data = await this.db.describeTimeToLive({ TableName }).promise()

      isEnabled = (
        data.TimeToLiveDescription &&
        data.TimeToLiveDescription.TimeToLiveStatus &&
        data.TimeToLiveDescription.TimeToLiveStatus === 'ENABLED'
      )
    } catch (err) {
      return { err }
    }

    if (isEnabled && Enabled) {
      return { data: this }
    }

    const params = {
      TableName,
      TimeToLiveSpecification: {
        AttributeName,
        Enabled
      }
    }

    try {
      await this.db.updateTimeToLive(params).promise()
    } catch (err) {
      return { err }
    }

    return { data: this }
  }

  async batchWrite (batch, opts = {}) {
    const ops = batch.map(({ 0: hash, 1: range, 2: value }) => {
      const Key = this.createKeyProperties(hash, range)

      if (value) {
        return {
          PutRequest: {
            Item: {
              ...Key,
              ...toDynamoJSON(value)
            }
          }
        }
      }

      return {
        DeleteRequest: { Key }
      }
    })

    {
      const params = {
        RequestItems: {
          [this.meta.TableName]: ops,
          ...opts
        }
      }

      try {
        await this.db.batchWriteItem(params).promise()
      } catch (err) {
        return { err }
      }
    }

    return {}
  }

  async batchRead (batch, opts = {}) {
    const { TableName } = this.meta

    const params = {
      RequestItems: {
        [TableName]: {
          Keys: batch.map(({ 0: hash, 1: range }) => {
            return this.createKeyProperties(hash, range)
          })
        }
      },
      ...opts
    }

    let data = {}

    try {
      data = await this.db.batchGetItem(params).promise()
    } catch (err) {
      return { err }
    }

    return { data: data.Responses[TableName] }
  }

  async update (hash, range, dsl, opts = {}) {
    if (typeof dsl === 'object') {
      dsl = range
      opts = {}
    }

    const {
      ExpressionAttributeValues,
      ExpressionAttributeNames,
      Expression: UpdateExpression
    } = queryParser(dsl)

    const params = {
      Key: this.createKeyProperties(hash, range),
      TableName: this.meta.TableName,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      UpdateExpression,
      ReturnValues: 'ALL_NEW',
      ...opts
    }

    let data = null
    try {
      data = await this.db.updateItem(params).promise()
    } catch (err) {
      return { err }
    }

    if (!data.Attributes) {
      return {}
    }

    return { data: toJSON(data.Attributes) }
  }

  async count (isManualCount, opts) {
    const params = {
      TableName: this.meta.TableName,
      ...opts
    }

    if (!isManualCount) {
      let data = {}

      try {
        data = await this.db.describeTable(params).promise()
      } catch (err) {
        return { err }
      }

      return { data: data.Table.ItemCount }
    }

    params.Select = 'COUNT'

    let count = 0

    while (true) {
      let data = null

      try {
        data = await this.db.scan(params).promise()
      } catch (err) {
        return { err }
      }

      count += data.Count

      if (!data.LastEvaluatedKey) {
        break
      }

      params.ExclusiveStartKey = data.LastEvaluatedKey
    }

    return { data: count, LastEvaluatedKey: params.LastEvaluatedKey }
  }

  async delete (hash, range, props = {}) {
    if (typeof range !== 'string') {
      props = range || {}
    }

    const params = {
      Key: this.createKeyProperties(hash, range),
      TableName: this.meta.TableName
    }

    try {
      await this.db.deleteItem(params).promise()
    } catch (err) {
      return { err }
    }

    return {}
  }

  async get (hash, range, opts = {}) {
    if (typeof range !== 'string') {
      opts = range || {}
    }

    const params = {
      Key: this.createKeyProperties(hash, range),
      TableName: this.meta.TableName,
      ...opts
    }

    let data = null

    try {
      data = await this.db.getItem(params).promise()
    } catch (err) {
      return { err }
    }

    if (!data.Item) {
      return { err: { notFound: true } }
    }

    return { data: toJSON(data.Item) }
  }

  async put (hash, range, props = {}, opts = {}) {
    if (typeof range !== 'string') {
      opts = props || {}
      props = range || {}
    }

    const params = {
      Item: {
        ...this.createKeyProperties(hash, range),
        ...this.disableATD ? props : toDynamoJSON(props)
      },
      TableName: this.meta.TableName,
      ...opts
    }

    try {
      await this.db.putItem(params).promise()
    } catch (err) {
      if (err.message === 'The conditional request failed') {
        return { err: { exists: true } }
      }

      return { err }
    }

    return {}
  }

  async putNew (hash, range, props = {}, opts = {}) {
    const condition = ['attribute_not_exists(#hash)']

    opts.ExpressionAttributeNames = {
      '#hash': this.hashKey
    }

    if (this.rangeKey) {
      condition.push('AND', 'attribute_not_exists(#range)')
      opts.ExpressionAttributeNames['#range'] = this.rangeKey
    }

    opts.ConditionExpression = condition.join(' ')
    return this.put(hash, range, props, opts)
  }

  query (dsl, opts = {}) {
    return this.iterator(dsl, opts, 'query')
  }

  scan (dsl, opts = {}) {
    return this.iterator(dsl, opts, 'scan')
  }

  iterator (dsl, opts = {}, method) {
    const {
      Expression,
      ExpressionAttributeValues,
      ExpressionAttributeNames
    } = queryParser(dsl)

    if (!Object.keys(ExpressionAttributeValues).length) {
      throw new Error('Query has no values')
    }

    if (!Expression.length) {
      throw new Error('Query is empty')
    }

    const params = {
      TableName: this.meta.TableName,
      ExpressionAttributeValues,
      ExpressionAttributeNames,
      ...opts
    }

    if (method === 'query') {
      params.KeyConditionExpression = Expression
    } else {
      params.FilterExpression = Expression
    }

    let values = []
    let iteratorIndex = 0
    let isFinished = false

    const hashKey = this.hashKey
    const hashType = this.hashType
    const rangeKey = this.rangeKey
    const rangeType = this.rangeType

    return {
      [Symbol.asyncIterator] () {
        return this
      },
      filter: async dsl => {
        const {
          ExpressionAttributeValues,
          Expression: FilterExpression
        } = queryParser(dsl)

        params.FilterExpression = FilterExpression
        params.ExpressionAttributeValues = Object.assign(
          params.ExpressionAttributeValues,
          ExpressionAttributeValues
        )
      },
      properties: async dsl => {
        params.ProjectionExpression = dsl
      },
      next: async () => {
        if (iteratorIndex < values.length) {
          return { value: values[iteratorIndex++] }
        }

        if (isFinished) {
          return { done: true }
        }

        let res = null

        try {
          res = await this.db[method](params).promise()
        } catch (err) {
          return { value: { err } }
        }

        if (res.Items) {
          const restructured = res.Items.map(item => {
            const key = [item[hashKey][hashType]]
            delete item[hashKey]

            if (rangeKey) {
              const range = item[rangeKey][rangeType]
              delete item[this.rangeKey]
              if (range) key.push(range)
            }

            return { data: { key, value: toJSON(item) } }
          })

          values = [...values, ...restructured]
        }

        if (typeof res.LastEvaluatedKey === 'undefined' || params.Limit) {
          isFinished = true
        } else {
          params.ExclusiveStartKey = res.LastEvaluatedKey
        }

        const value = values[iteratorIndex]

        if (typeof value === 'undefined') {
          return { done: true }
        }

        iteratorIndex++
        return { value }
      }
    }
  }
}

module.exports = { Table }
