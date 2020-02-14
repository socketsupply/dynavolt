const Dynavolt = require('../src')
const AWS = require('aws-sdk')
const test = require('tape')

const TEST_CONFIG = { region: 'us-west-2' }

require('./parser')

const _dynamo = new AWS.DynamoDB(TEST_CONFIG)

let db = null
let table = null

const reset = async t => {
  try {
    await _dynamo.deleteTable({ TableName: 'test' }).promise()
  } catch (err) {
    if (err.code !== 'ResourceNotFoundException') {
      t.fail(err.message)
    }
  }

  try {
    await _dynamo.waitFor('tableNotExists', { TableName: 'test' }).promise()
  } catch (err) {
    if (err.code !== 'ResourceNotFoundException') {
      t.fail(err.message)
    }
  }

  t.end()
}

test('create database instance', t => {
  db = new Dynavolt(AWS, TEST_CONFIG)
  t.ok(db.open, 'has open method')
  t.ok(db.create, 'has create method')
  t.end()
})

test('remote setup', reset)

test('create a table', async t => {
  const { err } = await db.create('test')
  t.ok(!err, 'the table was created')
  t.end()
})

test('open a table', async t => {
  const { err, table: _table } = await db.open('test')
  t.ok(!err, err && err.message)

  table = _table
  t.ok(table, 'the table was opened')
  t.end()
})

test('put', async t => {
  const { err } = await table.put('oregon', 'salem', { donuts: true })

  t.ok(!err, err && err.message)
  t.end()
})

test('get', async t => {
  const { err, data } = await table.get('oregon', 'salem')
  console.log('SALEN', data)

  t.ok(!err, err && err.message)
  t.ok(data.donuts === true, 'there are donuts in salem oregon')
  t.end()
})

test('update a value', async t => {
  const { err: errUpdate } = await table.update('oregon', 'salem', 'SET $(donuts) = BOOL(false)')
  t.ok(!errUpdate, errUpdate && errUpdate.message)

  const { err: errGet, data } = await table.get('oregon', 'salem')
  console.log('SALEN?', data)
  t.ok(!errGet, errGet && errGet.message)
  t.ok(data.donuts === false, 'there are donuts in salem oregon')
  t.end()
})

test('get a value that does not exist', async t => {
  const { err, data } = await table.get('oregon', 'witches')

  t.ok(err.notFound, 'not found')
  t.ok(!data, 'there are not witches in oregon')
  t.end()
})

test('put if not exists', async t => {
  const { err } = await table.putNew('oregon', 'salem', { donuts: true })

  t.ok(err, 'exits')
  t.end()
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
    t.end()
  }
})

test('delete a key that does not exist', async t => {
  const { err } = await table.get('foo', 'bar')
  t.ok(err.notFound)
  t.end()
})


test('remote teardown', reset)
