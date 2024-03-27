// @ts-check
'use strict'

import {
  BatchGetItemCommand,
  BatchWriteItemCommand,
  DeleteItemCommand,
  DescribeTableCommand,
  DescribeTimeToLiveCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  ScanCommand,
  UpdateItemCommand,
  UpdateTimeToLiveCommand
} from '@aws-sdk/client-dynamodb'

import { queryParser, toJSON, toDynamoJSON } from './util.js'

class Table {
  constructor (db, dbOpts = {}, opts = {}) {
    this.disableATD = Boolean(opts.disableATD)
    this.rangeType = null
    this.hashType = null
    this.rangeKey = null
    this.hashKey = null
    this.meta = null
    this.db = db || new DynamoDBClient({ ...dbOpts, ...opts })
  }

  createKeyProperties (hash, range) {
    if (!this.hashKey || !this.hashType || !this.rangeKey || !this.rangeType) {
      return {}
    }

    const o = {
      [this.hashKey]: { [this.hashType]: hash }
    }

    if (range) {
      o[this.rangeKey] = { [this.rangeType]: range }
    }

    return o
  }

  /**
   * Sets the TTL for the table.
   * @param {string} [AttributeName]
   * @param {boolean} [Enabled]
   * @return {dynavolt.Result<dynavolt.ITable>}
   */
  async setTTL (AttributeName = 'ttl', Enabled = true) {
    if (!this.meta || !this.meta.TableName) {
      return { err: new Error('No table open') }
    }

    let data = {}
    let isEnabled = false
    const TableName = /** @type {string} */ (this.meta && this.meta.TableName)

    try {
      data = await this.db.send(new DescribeTimeToLiveCommand({ TableName }))

      isEnabled = Boolean(
        data.TimeToLiveDescription &&
        data.TimeToLiveDescription.TimeToLiveStatus &&
        data.TimeToLiveDescription.TimeToLiveStatus === 'ENABLED'
      )
    } catch (err) {
      return { err }
    }

    if (isEnabled && Enabled) {
      // @ts-ignore
      return { data: this }
    }

    const params = {
      // @ts-ignore
      TableName,
      TimeToLiveSpecification: {
        AttributeName,
        Enabled
      }
    }

    try {
      await this.db.send(new UpdateTimeToLiveCommand(params))
    } catch (err) {
      return { err }
    }

    // @ts-ignore
    return { data: this }
  }

  /**
   * Performs a batch write.
   */
  async batchWrite (batch, opts = {}) {
    // @ts-ignore
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
          // @ts-ignore
          [this.meta.TableName]: ops,
          ...opts
        }
      }

      try {
        await this.db.send(new BatchWriteItemCommand(params))
      } catch (err) {
        return { err }
      }
    }

    return {}
  }

  /**
   * Performs a batch read.
   */
  async batchRead (batch, opts = {}) {
    // @ts-ignore
    const { TableName } = this.meta

    /** @type {AWS.CTOR.Types.BatchGetItemInput} */
    const params = {
      RequestItems: {
        [TableName]: {
          // @ts-ignore
          Keys: batch.map(({ 0: hash, 1: range }) => {
            return this.createKeyProperties(hash, range)
          })
        }
      },
      ...opts
    }

    /** @type {AWS.CTOR.Types.BatchGetItemOutput} */
    let data = {}

    try {
      data = await this.db.send(new BatchGetItemCommand(params))
    } catch (err) {
      return { err }
    }

    return { data: data.Responses && data.Responses[TableName] }
  }

  /**
   * Updates an item at `hash` and `range` with query `dsl`.
   * @param {dynavolt.Types.Hash} hash
   * @param {dynavolt.Types.Range} range
   * @param {dynavolt.Types.Query} dsl
   * @param {dynavolt.TableUpdateOptions} [opts]
   * @return {dynavolt.Result<AWS.CTOR.AttributeMap>}
   */
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

    /** @type {AWS.CTOR.UpdateItemInput} */
    const params = {
      Key: this.createKeyProperties(hash, range),
      // @ts-ignore
      TableName: this.meta && this.meta.TableName,
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      UpdateExpression,
      ReturnValues: 'ALL_NEW',
      ...opts
    }

    /** @type {AWS.CTOR.UpdateItemOutput?} */
    let data = null
    try {
      data = await this.db.send(new UpdateItemCommand(params))
    } catch (err) {
      return { err }
    }

    if (!data.Attributes) {
      return {}
    }

    return {
      data: /** @type {AWS.CTOR.AttributeMap} */ (toJSON(data.Attributes))
    }
  }

  /**
   * Computes row count for the table.
   * @param {boolean} isManualCount
   * @param {dynavolt.TableCountOptions} [opts]
   * @return {dynavolt.TableCountResult}
   */
  async count (isManualCount, opts) {
    const params = {
      // @ts-ignore
      TableName: this.meta && this.meta.TableName,
      ...opts
    }

    if (!isManualCount) {
      let data = {}

      try {
        data = await this.db.send(new DescribeTableCommand(params))
      } catch (err) {
        return { err }
      }

      return { data: data.Table && data.Table.ItemCount }
    }

    params.Select = 'COUNT'

    let count = 0

    while (true) {
      let data = null

      try {
        data = await this.db.send(new ScanCommand(params))
      } catch (err) {
        return { err }
      }

      if (data.Count) {
        count += data.Count
      }

      if (!data.LastEvaluatedKey) {
        break
      }

      params.ExclusiveStartKey = data.LastEvaluatedKey
    }

    return { data: count, LastEvaluatedKey: params.LastEvaluatedKey }
  }

  /**
   * Deletes an item at `hash` and `range`
   * @param {dynavolt.Types.Hash} hash
   * @param {dynavolt.Types.Range} range
   * @return {dynavolt.Result<void>}
   */
  async delete (hash, range) {
    /** @type {AWS.CTOR.DeleteItemInput} */
    const params = {
      Key: this.createKeyProperties(hash, range),
      // @ts-ignore
      TableName: this.meta && this.meta.TableName
    }

    try {
      await this.db.send(new DeleteItemCommand(params))
    } catch (err) {
      return { err }
    }

    return {}
  }

  /**
   * Get an item in the table by `hash` and `range`.
   * @param {dynavolt.Types.Hash} hash
   * @param {dynavolt.Types.Range} range
   * @param {dynavolt.TableGetOptions} [opts]
   * @return {dynavolt.Result<any>}
   */
  async get (hash, range, opts = {}) {
    if (typeof range !== 'string') {
      opts = range || {}
    }

    const params = {
      // @ts-ignore
      Key: this.createKeyProperties(hash, range),
      // @ts-ignore
      TableName: this.meta && this.meta.TableName,
      ...opts
    }

    let data = null

    try {
      data = await this.db.send(new GetItemCommand(params))
    } catch (err) {
      return { err }
    }

    if (!data.Item) {
      const err = new Error('Key not found in database')
      Object.assign(err, { notFound: true })
      return { err }
    }

    return { data: toJSON(data.Item) }
  }

  /**
   * Put an item into the table by `hash` and `range`, updating
   * if it already exists.
   * @param {dynavolt.Types.Hash} hash
   * @param {dynavolt.Types.Range} range
   * @param {dynavolt.TablePutInput} [props]
   * @param {dynavolt.TablePutOptions} [opts]
   * @return {dynavolt.Result<void>}
   */
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
      TableName: this.meta && this.meta.TableName,
      ...opts
    }

    try {
      // @ts-ignore
      await this.db.send(new PutItemCommand(params))
    } catch (err) {
      if (err instanceof Error && err.message === 'The conditional request failed') {
        return {
          err: Object.assign(err, { exists: true })
        }
      }

      return { err }
    }

    return {}
  }

  /**
   * Put a new item into the table by `hash` and `range`, failing if it one exists.
   * @param {dynavolt.Types.Hash} hash
   * @param {dynavolt.Types.Range} range
   * @param {dynavolt.TablePutInput} [props]
   * @param {dynavolt.TablePutOptions} [opts]
   * @return {dynavolt.Result<void>}
   */
  async putNew (hash, range, props = {}, opts = {}) {
    const condition = ['attribute_not_exists(#hash)']

    opts.ExpressionAttributeNames = {
      // @ts-ignore
      '#hash': this.hashKey
    }

    if (this.rangeKey) {
      condition.push('AND', 'attribute_not_exists(#range)')
      // @ts-ignore
      opts.ExpressionAttributeNames['#range'] = this.rangeKey
    }

    opts.ConditionExpression = condition.join(' ')
    return this.put(hash, range, props, opts)
  }

  /**
   * Query takes a conditional expression and returns an `Iterable` interface.
   * @param {dynavolt.Types.Query} dsl
   * @param {dynavolt.TableIteratorOptions} opts
   * @return {dynavolt.ITableIterator}
   */
  query (dsl, opts = {}) {
    return this.iterator(dsl, opts, 'query')
  }

  /**
   * Query takes a filter expression and returns an `Iterable` interface.
   * @param {dynavolt.Types.Query} dsl
   * @param {dynavolt.TableIteratorOptions} opts
   * @return {dynavolt.ITableIterator}
   */
  scan (dsl, opts = {}) {
    return this.iterator(dsl, opts, 'scan')
  }

  /**
   * Accepts a DSL query string to query or scan for items in an
   * `Iterable` interface.
   * @param {dynavolt.Types.Query} dsl
   * @param {dynavolt.TableIteratorOptions} opts
   * @param {dynavolt.Types.IteratorMethod} method
   * @return {dynavolt.ITableIterator}
   */
  iterator (dsl, opts, method) {
    if (!opts) {
      opts = {}
    }

    const {
      Expression,
      ExpressionAttributeValues,
      ExpressionAttributeNames
    } = queryParser(dsl)

    if (isEmpty(ExpressionAttributeValues) && method !== 'scan') {
      throw new Error('Query has no values')
    }

    if (!Expression.length && method !== 'scan') {
      throw new Error('Query is empty')
    }

    /** @type {AWS.CTOR.QueryInput & AWS.CTOR.ScanInput} */
    const params = {
      // @ts-ignore
      TableName: this.meta && this.meta.TableName,
      /** @type {AWS.CTOR.ExpressionAttributeValueMap} */
      ExpressionAttributeValues,
      /** @type {AWS.CTOR.ExpressionAttributeNameMap} */
      ExpressionAttributeNames,
      ...opts
    }

    if (method === 'query') {
      params.KeyConditionExpression = Expression
    } else {
      if (Expression) {
        params.FilterExpression = Expression
      }
      if (isEmpty(params.ExpressionAttributeNames)) {
        delete params.ExpressionAttributeNames
      }
      if (isEmpty(params.ExpressionAttributeValues)) {
        delete params.ExpressionAttributeValues
      }
    }

    /** @type {Array<{ data: { key: Array<string>, value: AWS.CTOR.AttributeMap } } >} */
    let values = []
    let iteratorIndex = 0
    let isFinished = false

    const hashKey = this.hashKey
    const hashType = this.hashType
    const rangeKey = this.rangeKey
    const rangeType = this.rangeType

    return {
      // @ts-ignore
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

        /** @type {AWS.CTOR.QueryOutput|AWS.CTOR.ScanOutput?} */
        let res = null

        try {
          // @ts-ignore
          const Ctor = method === 'query' ? QueryCommand : ScanCommand
          res = await this.db.send(new Ctor(params))
        } catch (err) {
          return { value: { err } }
        }

        if (res && res.Items) {
          const restructured = res.Items.map(item => {
            // @ts-ignore
            const key = [item[hashKey][hashType]]
            // @ts-ignore
            delete item[hashKey]

            if (rangeKey) {
              // @ts-ignore
              const range = item[rangeKey][rangeType]
              // @ts-ignore
              delete item[this.rangeKey]
              if (range) key.push(range)
            }

            return { data: { key, value: toJSON(item) } }
          })

          // @ts-ignore
          values = [...values, ...restructured]
        }

        if (res) {
          if (typeof res.LastEvaluatedKey === 'undefined' || params.Limit) {
            isFinished = true
          } else {
            params.ExclusiveStartKey = res.LastEvaluatedKey
          }
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

export { Table }

/**
 * Returns true if a given object is empty (or `null`), otherwise `false`.
 * @private
 * @param {object|null} [obj]
 * @return {boolean}
 */
function isEmpty (obj) {
  return !obj || Object.keys(obj).length === 0
}
