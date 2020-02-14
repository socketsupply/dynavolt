const assert = require('assert')
const { Table } = require('./table')

exports.open = async function (TableName, opts = {}) {
  assert(TableName, 'a table name parameter is required')

  if (this.tables[TableName]) {
    return { table: this.tables[TableName] } // the table is already "open".
  }

  const table = this.tables[TableName] = new Table(this.AWS, this.opts, opts)

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
