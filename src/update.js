const { queryParser } = require('./util')

exports.update = async function (hash, range, dsl, opts = {}) {
  if (typeof dsl === 'object') {
    dsl = range
    opts = {}
  }

  const {
    attributeValues: ExpressionAttributeValues,
    attributeNames: ExpressionAttributeNames,
    expression: UpdateExpression
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

  try {
    await this.db.updateItem(params).promise()
  } catch (err) {
    return { err }
  }

  return {}
}
