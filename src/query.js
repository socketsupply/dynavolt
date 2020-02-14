const { queryParser } = require('./util')

exports.query = async function (dsl, opts = {}) {
  return exports.iterator(dsl, opts, 'query')
}

exports.scan = async function (dsl, opts = {}) {
  return exports.iterator(dsl, opts, 'scan')
}

exports.iterator = async function (dsl, opts = {}, method) {
  const {
    expression,
    attributeValues: ExpressionAttributeValues
  } = queryParser(dsl)

  const params = {
    TableName: this.meta.TableName,
    ExpressionAttributeValues,
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
          delete item[this.hashKey]
          delete item[this.rangeKey]
          return [this.hashKey, this.rangeKey, this.toJSON(item)]
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
