// @ts-check
'use strict'
import fs from 'node:fs'
import { test } from 'node:test'
import * as assert from 'node:assert'
import { v4 as uuidv4 } from 'uuid'

import Dynavolt from '../src/index.js'

import {
  DynamoDBClient,
  DeleteTableCommand
} from '@aws-sdk/client-dynamodb'

import './parser-objects.js'
import './parser-dsl.js'

const TEST_CONFIG = { region: 'us-west-2' }

// const testid = 'temp'
const testid = uuidv4()
const TEST_TABLE = `test_${testid}`
const TEST_NOT_EXISTS_TABLE = `test-create-if-not-exists_${testid}`

const _dynamo = new DynamoDBClient(TEST_CONFIG)

let db = null
let table = null

test('create database instance', t => {
  db = new Dynavolt(TEST_CONFIG)
  assert.ok(db.open, 'has open method')
  assert.ok(db.create, 'has create method')
})

test('create a table', async t => {
  console.log('create a table started')
  const { err } = await db.create(TEST_TABLE)
  console.log('table created succeeded')
  assert.ok(!err, err ? err.message : 'the table was created')
})

test('open a table', async t => {
  const { err, data: _table } = await db.open(TEST_TABLE)
  assert.ok(!err, err && err.message)

  table = _table
  assert.ok(table, 'the table was opened')
})

// test('open a table that does not exist', async t => {
//   const { err, data: _table } = await db.open(TEST_NOT_EXISTS_TABLE, {
//     create: true
//   })
//   assert.ok(!err, err && err.message)
//   assert.ok(_table.db, 'underlying database created and opened')
//
// })

test('put', async t => {
  const { err } = await table.put('oregon', 'salem', { donuts: true })

  assert.ok(!err, err && err.message)
})

test('put complex', async t => {
  const { err } = await table.put('oregon', 'portland', {
    donuts: {
      a: { b: { c: 100 } }
    },
    ax: ['quxx', 'beep', 'boop'],
    n: 100
  })

  assert.ok(!err, err && err.message)
})

test('put more complex', async t => {
  // @ts-ignore
  const json = JSON.parse(await fs.promises.readFile('./test/fixture.json', 'utf8'))
  const { err } = await table.put('oregon', 'bend', json)

  assert.ok(!err, err && err.message)
})

test('get', async t => {
  const { err, data } = await table.get('oregon', 'salem')

  assert.ok(!err, err && err.message)
  assert.ok(data.donuts === true, 'there are donuts in salem oregon')
})

test('update a value', async t => {
  const { err: errUpdate } = await table.update('oregon', 'salem', 'SET donuts = false')
  assert.ok(!errUpdate, errUpdate && errUpdate.message)

  const { err: errGet, data } = await table.get('oregon', 'salem')
  assert.ok(!errGet, errGet && errGet.message)

  assert.ok(data.donuts === false, 'there are donuts in salem oregon')
})

test('get a value that does not exist', async t => {
  const { err, data } = await table.get('oregon', 'witches')

  assert.ok(err.notFound, 'not found')
  assert.ok(!data, 'there are not witches in oregon')
})

test('put if not exists', async t => {
  const { err } = await table.putNew('oregon', 'salem', { donuts: true })

  assert.ok(err.exists, 'exits')
})

test('delete and verify its been remove', async t => {
  {
    const { err } = await table.delete('oregon', 'salem')
    assert.ok(!err, err && err.message)
  }

  {
    const { err, data } = await table.get('oregon', 'salem')
    assert.ok(err.notFound)
    assert.ok(!data)
  }
})

test('delete a key that does not exist', async t => {
  const { err } = await table.get('foo', 'bar')
  assert.ok(err.notFound)
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
  assert.ok(!err, err && err.message)
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
  assert.ok(!err, err && err.message)
  assert.ok(Array.isArray(data), 'got an array of values')
  assert.ok(data.length === 5, 'correct number of items')
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
  assert.ok(!errBatch, errBatch && errBatch.message)

  const { err: errGet } = await table.get('b', 'b')
  assert.ok(errGet.notFound, 'the record was removed')
})

test('count all rows', async t => {
  const { err, data } = await table.count(true)
  assert.ok(!err, err && err.message)
  assert.equal(data, 9, 'count is correct')
})

test('full table scan', async t => {
  const itr = table.scan('')

  let count = 0

  for await (const { data } of itr) {
    const { key, value } = data
    count++

    assert.ok(key)
    assert.equal(typeof value, 'object')
  }

  assert.equal(count, 9)
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

    assert.ok(key)
    assert.equal(typeof value, 'object')

    values.push({ key, value })
  }

  assert.deepEqual(values, [
    { key: ['b', 'a'], value: { value: 3 } },
    { key: ['b', 'c'], value: { value: 3 } },
    { key: ['b', 'd'], value: { value: 3 } },
    { key: ['b', 'e'], value: { value: 3 } }
  ])

  assert.equal(count, 4)
})

test('scanning a chat/ts style range', async t => {
  const ops = [
    ['chat', '1628678141933', { value: 3 }],
    ['chat', '1628678141935', { value: 3 }],
    ['chat', '1628678141937', { value: 3 }]
  ]

  const { errBatch } = await table.batchWrite(ops)
  assert.ok(!errBatch, errBatch && errBatch.message)

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

    assert.ok(key)
    assert.equal(typeof value, 'object')

    values.push({ key, value })
  }

  assert.equal(count, 2)
  assert.deepEqual(values, [
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
    assert.ok(key.length === 2)
    assert.ok(typeof value === 'object')
  }

  assert.ok(count === 4)
})

test('query with a limit (native parameters)', async t => {
  const itr = table.query('hash = \'a\'', { Limit: 3 })

  let count = 0

  for await (const { data } of itr) {
    const { key, value } = data
    count++
    assert.ok(key.length === 2)
    assert.ok(typeof value === 'object')
  }

  assert.ok(count === 3)
})

test('query that returns nothing', async t => {
  const itr = table.query('hash = \'xxx\'', { Limit: 3 })

  let count = 0

  for await (const { err, data } of itr) {
    count++
    assert.ok(err && data)
  }

  assert.equal(count, 0)
})

test('update counter by 3', async (t) => {
  const rowId = uuidv4()

  const { err, data } = await table.update(
    'tickets', rowId,
    `SET count = if_not_exists(count, 0) + ${3}`
  )

  assert.ifError(err)
  assert.ok(data)
  assert.equal(data.count, 3)

  {
    const { err, data } = await table.get('tickets', rowId)
    assert.ifError(err)
    assert.deepEqual({
      range: rowId,
      hash: 'tickets',
      count: 3
    }, data)
  }
})

test('update counter by -3', async (t) => {
  const rowId = uuidv4()

  const { err, data } = await table.update(
    'tickets', rowId,
    `SET count = if_not_exists(count, 0) - ${3}`
  )

  assert.ifError(err)
  assert.ok(data)
  assert.equal(data.count, -3)

  {
    const { err, data } = await table.get('tickets', rowId)
    assert.ifError(err)
    assert.deepEqual({
      range: rowId,
      hash: 'tickets',
      count: -3
    }, data)
  }
})

test('remote teardown', async (t) => {
  try {
    await _dynamo.send(new DeleteTableCommand({ TableName: TEST_TABLE }))
  } catch (err) {
    if (err.name !== 'ResourceNotFoundException') {
      assert.fail(err.message)
    }
  }

  try {
    await _dynamo.send(new DeleteTableCommand({ TableName: TEST_NOT_EXISTS_TABLE }))
  } catch (err) {
    if (err.name !== 'ResourceNotFoundException') {
      assert.fail(err.message)
    }
  }
})
