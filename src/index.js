const assert = require('assert')

class Database {
  constructor (AWS, opts = {}) {
    assert(AWS, 'the first argument must be a reference to the aws-sdk')

    this.AWS = AWS // hold onto this so the Table class can use it too
    this.db = new AWS.DynamoDB(opts)

    this.opts = opts
    this.tables = {}
  }
}

Object.assign(Database.prototype, {
  ...require('./create'),
  ...require('./open')
})

module.exports = Database
