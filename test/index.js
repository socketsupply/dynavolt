const Dynavolt = require('../src')
const AWS = require('aws-sdk')
const test = require('tape')

require('./parser')

test('constructor', t => {
  const db = new Dynavolt(AWS, { region: 'us-east-1' })
  t.ok(db.open, 'has open method')
  t.ok(db.create, 'has create method')
  t.end()
})

test('
