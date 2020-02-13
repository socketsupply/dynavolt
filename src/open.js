const assert = require('assert')

exports.open = async function (TableName, opts = {}) {
  assert(TableName, 'a table name parameter is required')

  if (this.meta.TableName) {
    return { table: this } // the table is already "open".
  }

  this.meta.TableName = TableName

  const schema = this.meta.KeySchema
  const defs = this.meta.AttributeDefinitions

  this.hashKey = schema[0].AttributeName
  this.hashType = defs.find(d => d.AttributeName === this.hashKey)

  if (schema[1]) {
    this.rangeKey = schema[1].AttributeName
    this.rangeType = defs.find(d => d.AttributeName === this.rangeKey)
  }

  try {
    const t = await this.db.describeTable({ TableName }).promise()
    this.meta = t.Table

    if (t.Table.TableStatus === 'ACTIVE') {
      return { table: this }
    }
  } catch (err) {
    return { err }
  }
}
