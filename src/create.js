const assert = require('assert')
const sleep = n => new Promise(resolve => setTimeout(resolve, n))
const { getDynamoDataType } = require('./util')

exports.create = async function (
  TableName, hash = 'hash',
  range = 'range',
  opts = {}
) {
  assert(TableName, 'a table name parameter is required')

  const params = {
    TableName,
    AttributeDefinitions: [{
      AttributeName: hash,
      AttributeType: getDynamoDataType(hash)
    }],
    KeySchema: [{
      AttributeName: hash,
      KeyType: 'HASH'
    }]
  }

  if (range) {
    params.AttributeDefinitions.push({
      AttributeName: range,
      AttributeType: getDynamoDataType(range)
    })

    params.KeySchema.push({
      AttributeName: range,
      KeyType: 'RANGE'
    })
  }

  params.BillingMode = 'PAY_PER_REQUEST'

  params.SSESpecification = {
    Enabled: true
  }

  Object.assign(params, opts)

  try {
    await this.db.createTable(params).promise()
  } catch (err) {
    return { err }
  }

  try {
    await this.db.waitFor('tableExists', { TableName }).promise()
  } catch (err) {
    return { err }
  }

  while (true) {
    let data = {}

    try {
      data = await this.db.describeTable({ TableName }).promise()
    } catch (err) {
      return { err }
    }

    if (data.Table.TableStatus !== 'ACTIVE') {
      await sleep(2e3)
    } else {
      break
    }
  }

  return { table: this }
}
