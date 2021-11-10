// @ts-check
'use strict'

const assert = require('assert')

const { Table } = require('./table')
const { getDynamoDataType } = require('./util')

/**
 * @implements {dynavolt.IDatabase}
 * */
class Database {
  /**
   * A static accessor for the `Table` class used by the
   * `dynavolt` `Database` class.
   * @type {dynavolt.Constructors.Table}
   */
  static get Table () {
    // @ts-ignore
    return Table
  }

  /**
   * `Database` class constructor.
   * @constructor
   * @param {dynavolt.DatabaseDynamoDBOption} DynamoDB
   * @param {dynavolt.DatabaseOptions} [opts]
   */
  constructor (DynamoDB, opts = {}) {
    assert(
      typeof DynamoDB === 'function' ||
      (DynamoDB && typeof DynamoDB.DynamoDB === 'function'),
      'the first argument must be a reference to the DynamoDB constructor'
    )

    // @ts-ignore
    if (DynamoDB && typeof DynamoDB.DynamoDB === 'function') {
      // @ts-ignore
      DynamoDB = DynamoDB.DynamoDB
    }

    /** @type {dynavolt.Constructors.DynamoDB} */ // @ts-ignore
    this.DynamoDB = DynamoDB // hold onto this so the Table class can use it too

    /** @type {AWS.DynamoDB} */
    this.db = new this.DynamoDB(opts)

    /** @type {dynavolt.DatabaseOptions} */
    this.opts = opts || {}

    /** @type {dynavolt.OpenedDatabaseTables} */
    this.tables = {}
  }

  /**
   * Opens and returns a database table for this `DynamoDB` instance.
   * @param {string} TableName
   * @param {dynavolt.OpenTableOptions} [opts]
   * @returns {dynavolt.Result<dynavolt.ITable>}
   */
  async open (TableName, opts = { }) {
    assert(TableName, 'a table name parameter is required')

    const existing = this.tables[TableName]

    if (existing && existing.meta) {
      return { data: existing } // the table is already "open".
    }

    /** @type {dynavolt.ITable} */
    const table = new Table(this.DynamoDB, this.opts, opts)
    this.tables[TableName] = table

    try {
      const result = await this.db.describeTable({ TableName }).promise()
      table.meta = result.Table || null
    } catch (err) {
      if (err instanceof Error && err.name !== 'ResourceNotFoundException') {
        return { err }
      }

      if (!opts.create) {
        return { err: /** @type {Error} */ (err) }
      }

      const { err: errCreate } = await this.create(TableName)

      if (errCreate) {
        return { err: errCreate }
      }

      return this.open(TableName, opts)
    }

    if (!table.meta) {
      return { data: table }
    }

    const schema = table.meta.KeySchema
    const defs = table.meta.AttributeDefinitions

    if (schema && defs) {
      const hash = schema.find(o => o.KeyType === 'HASH')
      const range = schema.find(o => o.KeyType === 'RANGE')

      if (hash) {
        table.hashKey = hash.AttributeName
        const keyDef = defs.find(o => o.AttributeName === hash.AttributeName)
        if (keyDef) {
          table.hashType = keyDef.AttributeType
        }
      }

      if (range) {
        const rangeDef = defs.find(o => o.AttributeName === range.AttributeName)
        table.rangeKey = range.AttributeName

        if (rangeDef) {
          table.rangeType = rangeDef.AttributeType
        }
      }
    }

    return { data: table }
  }

  /**
   * Creates a new table for this database.
   * @param {string} TableName
   * @param {string} hash
   * @param {string} range
   * @param {dynavolt.CreateTableOptions} [opts]
   * @returns {dynavolt.Result<dynavolt.IDatabase>}
   */
  async create (TableName, hash = 'hash', range = 'range', opts = {}) {
    assert(TableName, 'a table name parameter is required')

    /** @type {AWS.DynamoDB.CreateTableInput} */
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
      return { err: /** @type {Error} */ (err) }
    }

    try {
      await this.db.waitFor('tableExists', { TableName }).promise()
    } catch (err) {
      return { err: /** @type {Error} */ (err) }
    }

    while (true) {
      /** @type {AWS.DynamoDB.Types.DescribeTableOutput} */
      let data = {}

      try {
        data = await this.db.describeTable({ TableName }).promise()
      } catch (err) {
        return { err: /** @type {Error} */ (err) }
      }

      if (data.Table && data.Table.TableStatus !== 'ACTIVE') {
        await sleep(2e3)
      } else {
        break
      }
    }

    // @ts-ignore
    return { data: this }
  }
}

module.exports = Database

/**
 * Waits `n` milliseconds before resolving.
 * @param {number} n
 * @return {Promise<void>}
 */
async function sleep (n) {
  return new Promise(resolve => setTimeout(resolve, n))
}
