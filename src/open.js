const assert = require('assert')
const { Table } = require('./table')

exports.open = async function (TableName, opts = {}) {
  assert(TableName, 'a table name parameter is required')

  if (this.tables[TableName]) {
    return { table: this.tables[TableName] } // the table is already "open".
  }

  const table = this.tables[TableName] = new Table(this.AWS, this.opts, opts)

  const schema = table.meta.KeySchema
  const defs = table.meta.AttributeDefinitions

  table.hashKey = schema[0].AttributeName
  table.hashType = defs.find(d => d.AttributeName === table.hashKey)

  if (schema[1]) {
    table.rangeKey = schema[1].AttributeName
    table.rangeType = defs.find(d => d.AttributeName === table.rangeKey)
  }

  try {
    const { Table } = await this.db.describeTable({ TableName }).promise()
    table.meta = Table
  } catch (err) {
    return { err }
  }

  return { table }
}
