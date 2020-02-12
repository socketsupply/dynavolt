const assert = require('assert')

exports.open = async function (TableName, opts = {}) {
  assert(TableName, 'a table name parameter is required')

  if (this.meta.TableName) {
    return { table: this } // the table is already "open".
  }

  this.meta.TableName = TableName

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
