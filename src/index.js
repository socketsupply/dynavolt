// @ts-check
'use strict'

import assert from 'assert'

import { Table } from './table.js'
import { getDynamoDataType } from './util.js'

import {
  CreateTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
  waitForTableExists
} from '@aws-sdk/client-dynamodb'

/**
 * A high level container for a DynamoDB database.
 * @extends {dynavolt.Database}
 * @implements {dynavolt.IDatabase}
 */
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
   * @param {dynavolt.DatabaseOptions} [opts]
   */
  constructor (opts = {}) {
    /** @type {AWS.DynamoDB} */
    this.db = new DynamoDBClient(opts)

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
    const table = new Table(this.db, this.opts, opts)
    this.tables[TableName] = table

    try {
      const result = await this.db.send(new DescribeTableCommand({ TableName }))
      table.meta = result.Table || null
    } catch (err) {
      if (err instanceof Error && err.name !== 'ResourceNotFoundException') {
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
      await this.db.send(new CreateTableCommand(params))
    } catch (err) {
      return { err }
    }

    try {
      await waitForTableExists({ client: this.db, maxWaitTime: 120 }, { TableName })
    } catch (err) {
      return { err }
    }

    while (true) {
      /** @type {AWS.DynamoDB.Types.DescribeTableOutput} */
      let data = {}

      try {
        data = await this.db.send(new DescribeTableCommand({ TableName }))
      } catch (err) {
        return { err }
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

export { Database }
export default Database

/**
 * Waits `n` milliseconds before resolving.
 * @param {number} n
 * @return {Promise<void>}
 */
async function sleep (n) {
  return new Promise(resolve => setTimeout(resolve, n))
}
