import { queryParser } from '../src/util.js'
import { test } from 'node:test'
import * as assert from 'node:assert'

test('empty', async t => {
  const r = queryParser('')

  assert.deepEqual(r, {
    Expression: '',
    ExpressionAttributeNames: {},
    ExpressionAttributeValues: {}
  })
})

test('single word', async t => {
  const r = queryParser('beep')

  assert.deepEqual(r, {
    Expression: 'beep',
    ExpressionAttributeNames: {},
    ExpressionAttributeValues: {}
  })
})

test('operand > operand', async t => {
  const r = queryParser('beep > 10')

  assert.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { N: '10' } },
    ExpressionAttributeNames: { '#V2': 'beep' },
    Expression: '#V2 > :V1'
  })
})

test('operand < operand', async t => {
  const r = queryParser('beep < 10')

  assert.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { N: '10' } },
    ExpressionAttributeNames: { '#V2': 'beep' },
    Expression: '#V2 < :V1'
  })
})

test('operand < operand', async t => {
  const r = queryParser('n < 10000')

  assert.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { N: '10000' } },
    ExpressionAttributeNames: { '#V2': 'n' },
    Expression: '#V2 < :V1'
  })
})

test('`escaped operand` > constant', async t => {
  const r = queryParser('`escaped value` > 10')

  assert.deepEqual(r, {
    ExpressionAttributeValues: { ':V2': { N: '10' } },
    ExpressionAttributeNames: { '#V1': 'escaped value' },
    Expression: '#V1 > :V2'
  })
})

test('"escaped operand" > constant', async t => {
  const r = queryParser('"escaped value" > 10')

  assert.deepEqual(r, {
    ExpressionAttributeValues: { ':V2': { N: '10' } },
    ExpressionAttributeNames: { '#V1': 'escaped value' },
    Expression: '#V1 > :V2'
  })
})

test('path', async t => {
  const r = queryParser('foo.bar = \'bazz\'')

  assert.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { S: 'bazz' } },
    ExpressionAttributeNames: { '#V2': 'foo', '#V3': 'bar' },
    Expression: '#V2.#V3 = :V1'
  })
})

test('operand = operand<number>', async t => {
  const r = queryParser('beep = 10')

  assert.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { N: '10' } },
    ExpressionAttributeNames: { '#V2': 'beep' },
    Expression: '#V2 = :V1'
  })
})

test('operand = operand<number> single digit', async t => {
  const r = queryParser('beep = 1')

  assert.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { N: '1' } },
    ExpressionAttributeNames: { '#V2': 'beep' },
    Expression: '#V2 = :V1'
  })
})

test('operand = operand<number> zero value', async t => {
  const r = queryParser('beep = 0')

  assert.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { N: '0' } },
    ExpressionAttributeNames: { '#V2': 'beep' },
    Expression: '#V2 = :V1'
  })
})

test('operand = operand<float>', async t => {
  const r = queryParser('beep = 10.025')

  assert.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { N: '10.025' } },
    ExpressionAttributeNames: { '#V2': 'beep' },
    Expression: '#V2 = :V1'
  })
})

test('operand = operand<string>', async t => {
  const r = queryParser('beep = \'foo\'')

  assert.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { S: 'foo' } },
    ExpressionAttributeNames: { '#V2': 'beep' },
    Expression: '#V2 = :V1'
  })
})

test('operand = operand<binary>', async t => {
  const r = queryParser('beep = <foo>')

  assert.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { B: 'foo' } },
    ExpressionAttributeNames: { '#V2': 'beep' },
    Expression: '#V2 = :V1'
  })
})

test('operand <> operand', async t => {
  const r = queryParser('beep <> 10')

  assert.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { N: '10' } },
    ExpressionAttributeNames: { '#V2': 'beep' },
    Expression: '#V2 <> :V1'
  })
})

test('operand string conditional', async t => {
  const r = queryParser('hash = \'x\' and range = \'y\'')

  assert.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { S: 'x' }, ':V2': { S: 'y' } },
    ExpressionAttributeNames: { '#V3': 'hash', '#V4': 'range' },
    Expression: '#V3 = :V1 and #V4 = :V2'
  })
})

test('operand operator operand conditional', async t => {
  const r = queryParser('beep > 10 AND boop = \'barf\'')

  assert.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { S: 'barf' }, ':V2': { N: '10' } },
    ExpressionAttributeNames: { '#V3': 'beep', '#V4': 'boop' },
    Expression: '#V3 > :V2 AND #V4 = :V1'
  })
})

test('...respects parens', async t => {
  const r = queryParser('beep > 10 AND (boop = \'barf\')')

  assert.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { S: 'barf' }, ':V2': { N: '10' } },
    ExpressionAttributeNames: { '#V3': 'beep', '#V4': 'boop' },
    Expression: '#V3 > :V2 AND (#V4 = :V1)'
  })
})

test('binary value', async t => {
  const r = queryParser('foo = <SGVsbG8sIFdvcmxkLgo=>')

  assert.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { B: 'SGVsbG8sIFdvcmxkLgo=' } },
    ExpressionAttributeNames: { '#V2': 'foo' },
    Expression: '#V2 = :V1'
  })
})

test('single value set', async t => {
  const r = queryParser('SET foo = \'bar\'')

  assert.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { S: 'bar' } },
    ExpressionAttributeNames: { '#V2': 'foo' },
    Expression: 'SET #V2 = :V1'
  })
})

test('multi value set', async t => {
  const r = queryParser('SET count = count + 200, foo = 10')

  assert.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { N: '200' }, ':V2': { N: '10' } },
    ExpressionAttributeNames: { '#V3': 'count', '#V4': 'count', '#V5': 'foo' },
    Expression: 'SET #V3 = #V4 + :V1, #V5 = :V2'
  })
})

test('multi value set with function', async t => {
  const r = queryParser('SET count = if_not_exists(count, 0) + 1')

  assert.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { N: '0' }, ':V2': { N: '1' } },
    ExpressionAttributeNames: { '#V3': 'count', '#V4': 'count' },
    Expression: 'SET #V4 = if_not_exists(#V3, :V1) + :V2'
  })
})

test('SET with negative number', t => {
  const r = queryParser('SET count = if_not_exists(count, 0) - 1')

  assert.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { N: '0' }, ':V2': { N: '1' } },
    ExpressionAttributeNames: { '#V3': 'count', '#V4': 'count' },
    Expression: 'SET #V4 = if_not_exists(#V3, :V1) - :V2'
  })
})

test('is null value', async t => {
  const r = queryParser('foo = null')

  assert.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { NULL: true } },
    ExpressionAttributeNames: { '#V2': 'foo' },
    Expression: '#V2 = :V1'
  })
})

test('is true value', async t => {
  const r = queryParser('foo = true')

  assert.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { BOOL: true } },
    ExpressionAttributeNames: { '#V2': 'foo' },
    Expression: '#V2 = :V1'
  })
})

test('is false value', async t => {
  const r = queryParser('foo = false')

  assert.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { BOOL: false } },
    ExpressionAttributeNames: { '#V2': 'foo' },
    Expression: '#V2 = :V1'
  })
})

test('operand operator operand with parens', async t => {
  const r = queryParser('(foo = null)')

  assert.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { NULL: true } },
    ExpressionAttributeNames: { '#V2': 'foo' },
    Expression: '(#V2 = :V1)'
  })
})

test('function(path, value<string>)', async t => {
  const r = queryParser('contains(beep.boop[1], \'bar\')')

  assert.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { S: 'bar' } },
    ExpressionAttributeNames: { '#V2': 'beep', '#V3': 'boop' },
    Expression: 'contains(#V2.#V3[1], :V1)'
  })
})

test('function(path, value<number>)', async t => {
  const r = queryParser('contains(beep.boop[1], 100)')

  assert.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { N: '100' } },
    ExpressionAttributeNames: { '#V2': 'beep', '#V3': 'boop' },
    Expression: 'contains(#V2.#V3[1], :V1)'
  })
})

test('function(path, value<float>)', async t => {
  const r = queryParser('contains(beep.boop[1], 100.00005)')

  assert.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { N: '100.00005' } },
    ExpressionAttributeNames: { '#V2': 'beep', '#V3': 'boop' },
    Expression: 'contains(#V2.#V3[1], :V1)'
  })
})

test('function(path, value<binary>)', async t => {
  const r = queryParser('contains(beep.boop[1], <bar>)')

  assert.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { B: 'bar' } },
    ExpressionAttributeNames: { '#V2': 'beep', '#V3': 'boop' },
    Expression: 'contains(#V2.#V3[1], :V1)'
  })
})

test('function(path)', async t => {
  const r = queryParser('size(foo.bar)')

  assert.deepEqual(r, {
    ExpressionAttributeValues: {},
    ExpressionAttributeNames: { '#V1': 'foo', '#V2': 'bar' },
    Expression: 'size(#V1.#V2)'
  })
})

test('function(path[i])', async t => {
  const r = queryParser('size(foo.bar[1])')

  assert.deepEqual(r, {
    ExpressionAttributeValues: {},
    ExpressionAttributeNames: { '#V1': 'foo', '#V2': 'bar' },
    Expression: 'size(#V1.#V2[1])'
  })
})

test('...combined with function', async t => {
  const r = queryParser('size(foo.bar) AND contains(quxx.bar, 100)')

  assert.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { N: '100' } },
    ExpressionAttributeNames: { '#V2': 'foo', '#V3': 'bar', '#V4': 'quxx', '#V5': 'bar' },
    Expression: 'size(#V2.#V3) AND contains(#V4.#V5, :V1)'
  })
})

test('...combined with index', async t => {
  const r = queryParser('size(foo.bar[100]) AND contains(quxx.bar[100], 100)')

  assert.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { N: '100' } },
    ExpressionAttributeNames: { '#V2': 'foo', '#V3': 'bar', '#V4': 'quxx', '#V5': 'bar' },
    Expression: 'size(#V2.#V3[100]) AND contains(#V4.#V5[100], :V1)'
  })
})

test('between', async t => {
  const r = queryParser('foo.borp[1] BETWEEN 10 AND 20')

  assert.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { N: '10' }, ':V2': { N: '20' } },
    ExpressionAttributeNames: { '#V3': 'foo', '#V4': 'borp' },
    Expression: '#V3.#V4[1] BETWEEN :V1 AND :V2'
  })
})

test('delete value<string>', async t => {
  const r = queryParser('DELETE bop \'quxx\'')

  assert.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { S: 'quxx' } },
    ExpressionAttributeNames: { '#V2': 'bop' },
    Expression: 'DELETE #V2 :V1'
  })
})

test('delete value<number>', async t => {
  const r = queryParser('DELETE burp.borp[1] 10')

  assert.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { N: '10' } },
    ExpressionAttributeNames: { '#V2': 'burp', '#V3': 'borp' },
    Expression: 'DELETE #V2.#V3[1] :V1'
  })
})

test('remove value<number>', async t => {
  const r = queryParser('REMOVE burp.borp[1] 2')

  assert.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { N: '2' } },
    ExpressionAttributeNames: { '#V2': 'burp', '#V3': 'borp' },
    Expression: 'REMOVE #V2.#V3[1] :V1'
  })
})

test('add value<number>', async t => {
  const r = queryParser('ADD burp.borp[1] 2')

  assert.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { N: '2' } },
    ExpressionAttributeNames: { '#V2': 'burp', '#V3': 'borp' },
    Expression: 'ADD #V2.#V3[1] :V1'
  })
})

test('in list of number', async t => {
  const r = queryParser('foo IN (10 20 30)')

  assert.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { N: '10' }, ':V2': { N: '20' }, ':V3': { N: '30' } },
    ExpressionAttributeNames: { '#V4': 'foo' },
    Expression: '#V4 IN (:V1 :V2 :V3)'
  })
})

test('in list of string', async t => {
  const r = queryParser('foo IN (\'foo\' \'bar\' \'bazz\')')

  assert.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { S: 'foo' }, ':V2': { S: 'bar' }, ':V3': { S: 'bazz' } },
    ExpressionAttributeNames: { '#V4': 'foo' },
    Expression: '#V4 IN (:V1 :V2 :V3)'
  })
})

test('in list of binary', async t => {
  const r = queryParser('foo IN (<beep> <boop> <burp>)')

  assert.deepEqual(r, {
    ExpressionAttributeValues: { ':V2': { B: 'beep' }, ':V3': { B: 'boop' }, ':V4': { B: 'burp' } },
    ExpressionAttributeNames: { '#V1': 'foo' },
    Expression: '#V1 IN (:V2 :V3 :V4)'
  })
})

test('in with path and path index', async t => {
  const r = queryParser('foo.bar[1] IN (10 20 30)')

  assert.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { N: '10' }, ':V2': { N: '20' }, ':V3': { N: '30' } },
    ExpressionAttributeNames: { '#V4': 'foo', '#V5': 'bar' },
    Expression: '#V4.#V5[1] IN (:V1 :V2 :V3)'
  })
})

test('in with and clause', async t => {
  const r = queryParser('(ProductCategory IN (<foo> <b>)) and (Price BETWEEN 1 and 10)')

  assert.deepEqual(r, {
    ExpressionAttributeValues: {
      ':V1': { N: '1' },
      ':V2': { N: '10' },
      ':V5': { B: 'foo' },
      ':V6': { B: 'b' }
    },
    ExpressionAttributeNames: { '#V3': 'Price', '#V4': 'ProductCategory' },
    Expression: '(#V4 IN (:V5 :V6)) and (#V3 BETWEEN :V1 and :V2)'
  })
})
