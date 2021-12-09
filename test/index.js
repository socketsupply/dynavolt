// @ts-check
'use strict'

const AWS = require('aws-sdk')
const { test } = require('tapzero')
const uuid = require('uuid').v4

const Dynavolt = require('../src')

const TEST_CONFIG = { region: 'us-west-2' }

// const testid = 'temp'
const testid = uuid()
const TEST_TABLE = `test_${testid}`
const TEST_NOT_EXISTS_TABLE = `test-create-if-not-exists_${testid}`

require('./parser-objects')
require('./parser-dsl')

const _dynamo = new AWS.DynamoDB(TEST_CONFIG)

/** @type {Dynavolt} */
let db = null
/** @type {import('../src/table').Table} */
let table = null

test('create database instance', t => {
  db = new Dynavolt(AWS.DynamoDB, TEST_CONFIG)
  t.ok(db.open, 'has open method')
  t.ok(db.create, 'has create method')
})

test('create a table', async t => {
  t.comment('create a table started')
  const { err } = await db.create(TEST_TABLE)
  t.comment('table created succeeded')
  t.ok(!err, err ? err.message : 'the table was created')
})

test('open a table', async t => {
  const { err, data: _table } = await db.open(TEST_TABLE)
  t.ok(!err, err && err.message)

  table = _table
  t.ok(table, 'the table was opened')
})

// test('open a table that does not exist', async t => {
//   const { err, data: _table } = await db.open(TEST_NOT_EXISTS_TABLE, {
//     create: true
//   })
//   t.ok(!err, err && err.message)
//   t.ok(_table.db, 'underlying database created and opened')
//
// })

test('put', async t => {
  const { err } = await table.put('oregon', 'salem', { donuts: true })

  t.ok(!err, err && err.message)
})

test('put complex', async t => {
  const { err } = await table.put('oregon', 'portland', {
    donuts: {
      a: { b: { c: 100 } }
    },
    ax: ['quxx', 'beep', 'boop'],
    n: 100
  })

  t.ok(!err, err && err.message)
})

test('put more complex', async t => {
  // @ts-ignore
  const { err } = await table.put('oregon', 'bend', require('./fixture.json'))

  t.ok(!err, err && err.message)
})

test('get', async t => {
  const { err, data } = await table.get('oregon', 'salem')

  t.ok(!err, err && err.message)
  t.ok(data.donuts === true, 'there are donuts in salem oregon')
})

test('update a value', async t => {
  const { err: errUpdate } = await table.update('oregon', 'salem', 'SET donuts = false')
  t.ok(!errUpdate, errUpdate && errUpdate.message)

  const { err: errGet, data } = await table.get('oregon', 'salem')
  t.ok(!errGet, errGet && errGet.message)

  t.ok(data.donuts === false, 'there are donuts in salem oregon')
})

test('get a value that does not exist', async t => {
  const { err, data } = await table.get('oregon', 'witches')

  t.ok(err.notFound, 'not found')
  t.ok(!data, 'there are not witches in oregon')
})

test('put if not exists', async t => {
  const { err } = await table.putNew('oregon', 'salem', { donuts: true })

  t.ok(err.exists, 'exits')
})

test('delete and verify its been remove', async t => {
  {
    const { err } = await table.delete('oregon', 'salem')
    t.ok(!err, err && err.message)
  }

  {
    const { err, data } = await table.get('oregon', 'salem')
    t.ok(err.notFound)
    t.ok(!data)
  }
})

test('delete a key that does not exist', async t => {
  const { err } = await table.get('foo', 'bar')
  t.ok(err.notFound)
})

test('batch write', async t => {
  const ops = [
    ['a', 'a', { value: 0 }],
    ['a', 'b', { value: 1 }],
    ['a', 'c', { value: 2 }],
    ['b', 'a', { value: 3 }],
    ['b', 'b', { value: 4 }]
  ]

  const { err } = await table.batchWrite(ops)
  t.ok(!err, err && err.message)
})

test('batch read', async t => {
  const ops = [
    ['a', 'a'],
    ['a', 'b'],
    ['a', 'c'],
    ['b', 'a'],
    ['b', 'b']
  ]

  const { err, data } = await table.batchRead(ops)
  t.ok(!err, err && err.message)
  t.ok(Array.isArray(data), 'got an array of values')
  t.ok(data.length === 5, 'correct number of items')
})

test('batch write with deletes', async t => {
  const ops = [
    ['a', 'a', { value: 0 }],
    ['a', 'b', { value: 1 }],
    ['a', 'c', { value: 2 }],
    ['b', 'a', { value: 3 }],
    ['b', 'b'],
    ['b', 'c', { value: 3 }],
    ['b', 'd', { value: 3 }],
    ['b', 'e', { value: 3 }]
  ]

  const { errBatch } = await table.batchWrite(ops)
  t.ok(!errBatch, errBatch && errBatch.message)

  const { err: errGet } = await table.get('b', 'b')
  t.ok(errGet.notFound, 'the record was removed')
})

test('count all rows', async t => {
  const { err, data } = await table.count(true)
  t.ok(!err, err && err.message)
  t.equal(data, 9, 'count is correct')
})

test('full table scan', async t => {
  const itr = table.scan('')

  let count = 0

  for await (const { data } of itr) {
    const { key, value } = data
    count++

    t.ok(key)
    t.equal(typeof value, 'object')
  }

  t.equal(count, 9)
})

test('table scan from offset', async t => {
  // Start a scan at the END of [a, ~] to capture all of [b, ...]
  const itr = table.scan('hash > \'a\'')

  let count = 0
  const values = []

  for await (const { err, data } of itr) {
    if (err) throw err
    const { key, value } = data
    if (key[0] > 'b') {
      break
    }

    count++

    t.ok(key)
    t.equal(typeof value, 'object')

    values.push({ key, value })
  }

  t.deepEqual(values, [
    { key: ['b', 'a'], value: { value: 3 } },
    { key: ['b', 'c'], value: { value: 3 } },
    { key: ['b', 'd'], value: { value: 3 } },
    { key: ['b', 'e'], value: { value: 3 } }
  ])

  t.equal(count, 4)
})

test('scanning a chat/ts style range', async t => {
  const ops = [
    ['chat', '1628678141933', { value: 3 }],
    ['chat', '1628678141935', { value: 3 }],
    ['chat', '1628678141937', { value: 3 }]
  ]

  const { errBatch } = await table.batchWrite(ops)
  t.ok(!errBatch, errBatch && errBatch.message)

  const itr = table.scan('hash = \'chat\' AND range > \'1628678141934\'')

  let count = 0
  const values = []

  for await (const { err, data } of itr) {
    if (err) throw err
    const { key, value } = data
    if (key[0] > 'chat') {
      break
    }

    count++

    t.ok(key)
    t.equal(typeof value, 'object')

    values.push({ key, value })
  }

  t.equal(count, 2)
  t.deepEqual(values, [
    { key: ['chat', '1628678141935'], value: { value: 3 } },
    { key: ['chat', '1628678141937'], value: { value: 3 } }
  ])
})

test('query', async t => {
  const itr = table.query('hash = \'b\'')

  let count = 0

  for await (const { data } of itr) {
    const { key, value } = data
    count++
    t.ok(key.length === 2)
    t.ok(typeof value === 'object')
  }

  t.ok(count === 4)
})

test('query with a limit (native parameters)', async t => {
  const itr = table.query('hash = \'a\'', { Limit: 3 })

  let count = 0

  for await (const { data } of itr) {
    const { key, value } = data
    count++
    t.ok(key.length === 2)
    t.ok(typeof value === 'object')
  }

  t.ok(count === 3)
})

test('query that returns nothing', async t => {
  const itr = table.query('hash = \'xxx\'', { Limit: 3 })

  let count = 0

  for await (const { err, data } of itr) {
    count++
    t.ok(err && data)
  }

  t.equal(count, 0)
})

test('update counter by 3', async (t) => {
  const rowId = uuid()

  const { err, data } = await table.update(
    'tickets', rowId,
    `SET count = if_not_exists(count, 0) + ${3}`
  )

  t.ifError(err)
  t.ok(data)
  t.equal(data.count, 3)

  {
    const { err, data } = await table.get('tickets', rowId)
    t.ifError(err)
    t.deepEqual({
      range: rowId,
      hash: 'tickets',
      count: 3
    }, data)
  }
})

test('update counter by -3', async (t) => {
  const rowId = uuid()

  const { err, data } = await table.update(
    'tickets', rowId,
    `SET count = if_not_exists(count, 0) - ${3}`
  )

  t.ifError(err)
  t.ok(data)
  t.equal(data.count, -3)

  {
    const { err, data } = await table.get('tickets', rowId)
    t.ifError(err)
    t.deepEqual({
      range: rowId,
      hash: 'tickets',
      count: -3
    }, data)
  }
})

test('remote teardown', async (t) => {
  try {
    await _dynamo.deleteTable({ TableName: TEST_TABLE }).promise()
  } catch (err) {
    if (err.name !== 'ResourceNotFoundException') {
      t.fail(err.message)
    }
  }

  try {
    await _dynamo.deleteTable({ TableName: TEST_NOT_EXISTS_TABLE }).promise()
  } catch (err) {
    if (err.name !== 'ResourceNotFoundException') {
      t.fail(err.message)
    }
  }
})
