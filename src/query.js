const { queryParser } = require('./util')

exports.query = function (dsl, opts = {}) {
  return exports.iterator.call(this, dsl, opts, 'query')
}

exports.scan = function (dsl, opts = {}) {
  return exports.iterator.call(this, dsl, opts, 'scan')
}

exports.iterator = function (dsl, opts = {}, method) {
  const {
    expression,
    attributeValues: ExpressionAttributeValues,
    attributeNames: ExpressionAttributeNames
  } = queryParser(dsl)

  if (!Object.keys(ExpressionAttributeValues).length) {
    throw new Error('Query has no values')
  }

  if (!expression.length) {
    throw new Error('Query is empty')
  }

  const params = {
    TableName: this.meta.TableName,
    ExpressionAttributeValues,
    ExpressionAttributeNames,
    ...opts
  }

  if (method === 'query') {
    params.KeyConditionExpression = expression
  } else {
    params.FilterExpression = expression
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
        attributeValues: ExpressionAttributeValues,
        expression: FilterExpression
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

      const res = await this.db[method](params).promise()

      if (res.Items) {
        const restructured = res.Items.map(item => {
          const key = [item[hashKey][hashType]]
          delete item[hashKey]

          if (rangeKey) {
            const range = item[rangeKey][rangeType]
            delete item[this.rangeKey]
            if (range) key.push(range)
          }

          return { key, value: this.toJSON(item) }
        })

        values = [...values, ...restructured]
      }

      if (typeof res.LastEvaluatedKey === 'undefined' || params.Limit) {
        isFinished = true
      } else {
        params.ExclusiveStartKey = res.LastEvaluatedKey
      }

      return { value: values[iteratorIndex++] }
    }
  }
}
