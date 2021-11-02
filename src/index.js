'use strict'

const assert = require('assert')

const { Table } = require('./table')
const { getDynamoDataType } = require('./util')

class Database {
  /**
   * A static accessor for the `Table` class used by the
   * `dynavolt` `Database` class.
   * @public
   * @static
   * @accessor
   * @type {Table}
   */
  static get Table () {
    return Table
  }

  /**
   * `Database` class constructor.
   * @constructor
   * @param {function} DynamoDB
   * @param {object} [opts]
   */
  constructor (DynamoDB, opts = {}) {
    assert(DynamoDB, 'the first argument must be a reference to the DynamoDB constructor')

    if ('function' !== typeof DynamoDB && 'function' === typeof DynamoDB.DynamoDB) {
      DynamoDB = DynamoDB.DynamoDB
    }

    /** @type {function} */
    this.DynamoDB = DynamoDB // hold onto this so the Table class can use it too

    /** @type {import('aws-sdk').DynamoDB} */
    this.db = new DynamoDB(opts)

    /** @type {object=} */
    this.opts = opts

    /** @type {{ [key: string]: Table }} */
    this.tables = {}
  }

  /**
   * Opens and returns a database table for this `DynamoDB` instance.
   * @param {string} TableName
   * @param {object} [opts]
   * @returns {Promise<{ err?: Error, data?: Table }>}
   */
  async open (TableName, opts = {}) {
    assert(TableName, 'a table name parameter is required')

    const existing = this.tables[TableName]

    if (existing && existing.meta) {
      return { data: existing } // the table is already "open".
    }

    const table = this.tables[TableName] = new Table(this.DynamoDB, this.opts, opts)

    try {
      const { Table } = await this.db.describeTable({ TableName }).promise()
      table.meta = Table
    } catch (err) {
      if (err.name !== 'ResourceNotFoundException') {
        return { err }
      }

      if (!opts.create) {
        return { err }
      }

      const { err: errCreate } = await this.create(TableName)

      if (errCreate) {
        return { err: errCreate }
      }

      return this.open(TableName, opts)
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

    return { data: table }
  }

  /**
   * Creates a new table for this database.
   * @param {string} TableName
   * @param {string} hash
   * @param {string} range
   * @param {object} [opts]
   * @returns {Promise<{ err?: Error, data?: Table }>}
   */
  async create (TableName, hash = 'hash', range = 'range', opts = {}) {
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

    const isOnDemand = this.opts.onDemand === true
    const hasEndpoint = !!this.opts.endpoint
    const hasCapacity = opts.readCapacity || opts.writeCapacity

    if (!isOnDemand && (hasEndpoint || hasCapacity)) {
      params.ProvisionedThroughput = {
        ReadCapacityUnits: opts.readCapacity || 5,
        WriteCapacityUnits: opts.writeCapacity || 5
      }
    } else {
      params.BillingMode = 'PAY_PER_REQUEST'
    }

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

    return { data: this }
  }
}

module.exports = Database

async function sleep (n) {
  return new Promise(resolve => setTimeout(resolve, n))
}
