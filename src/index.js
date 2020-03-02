'use strict'

const assert = require('assert')

const { Table } = require('./table')
const { getDynamoDataType } = require('./util')

class Database {
  constructor (DynamoDB, opts = {}) {
    assert(DynamoDB, 'the first argument must be a reference to the aws-sdk')

    this.DynamoDB = DynamoDB // hold onto this so the Table class can use it too
    this.db = new DynamoDB(opts)

    this.opts = opts
    this.tables = {}
  }

  async open (TableName, opts = {}) {
    assert(TableName, 'a table name parameter is required')

    if (this.tables[TableName]) {
      return { table: this.tables[TableName] } // the table is already "open".
    }

    const table = this.tables[TableName] = new Table(this.DynamoDB, this.opts, opts)

    try {
      const { Table } = await this.db.describeTable({ TableName }).promise()
      table.meta = Table
    } catch (err) {
      return { err }
    }

    const schema = table.meta.KeySchema
    const defs = table.meta.AttributeDefinitions

    const hash = schema.find(o => o.KeyType === 'HASH')
    const range = schema.find(o => o.KeyType === 'RANGE')

    const keyDef = defs.find(o => o.AttributeName === hash.AttributeName)
    table.hashKey = hash.AttributeName
    table.hashType = keyDef.AttributeType

    if (range) {
      const rangeDef = defs.find(o => o.AttributeName === range.AttributeName)
      table.rangeKey = range.AttributeName
      table.rangeType = rangeDef.AttributeType
    }

    return { table }
  }

  async create (
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
}

module.exports = Database

async function sleep (n) {
  return new Promise(resolve => setTimeout(resolve, n))
}
