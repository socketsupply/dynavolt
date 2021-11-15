const { queryParser } = require('../src/util')
const test = require('@pre-bundled/tape')

test('empty', t => {
  const r = queryParser('')

  t.deepEqual(r, {
    Expression: '',
    ExpressionAttributeNames: {},
    ExpressionAttributeValues: {}
  })

  t.end()
})

test('single word', t => {
  const r = queryParser('beep')

  t.deepEqual(r, {
    Expression: 'beep',
    ExpressionAttributeNames: {},
    ExpressionAttributeValues: {}
  })

  t.end()
})

test('operand > operand', t => {
  const r = queryParser('beep > 10')

  t.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { N: '10' } },
    ExpressionAttributeNames: { '#V2': 'beep' },
    Expression: '#V2 > :V1'
  })

  t.end()
})

test('operand < operand', t => {
  const r = queryParser('beep < 10')

  t.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { N: '10' } },
    ExpressionAttributeNames: { '#V2': 'beep' },
    Expression: '#V2 < :V1'
  })

  t.end()
})

test('operand < operand', t => {
  const r = queryParser('n < 10000')

  t.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { N: '10000' } },
    ExpressionAttributeNames: { '#V2': 'n' },
    Expression: '#V2 < :V1'
  })

  t.end()
})

test('path', t => {
  const r = queryParser('foo.bar = \'bazz\'')
  console.log(r)

  t.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { S: 'bazz' } },
    ExpressionAttributeNames: { '#V2': 'foo', '#V3': 'bar' },
    Expression: '#V2.#V3 = :V1'
  })

  t.end()
})

test('operand = operand<number>', t => {
  const r = queryParser('beep = 10')

  t.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { N: '10' } },
    ExpressionAttributeNames: { '#V2': 'beep' },
    Expression: '#V2 = :V1'
  })

  t.end()
})

test('operand = operand<number> single digit', t => {
  const r = queryParser('beep = 1')

  t.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { N: '1' } },
    ExpressionAttributeNames: { '#V2': 'beep' },
    Expression: '#V2 = :V1'
  })

  t.end()
})

test('operand = operand<number> zero value', t => {
  const r = queryParser('beep = 0')

  t.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { N: '0' } },
    ExpressionAttributeNames: { '#V2': 'beep' },
    Expression: '#V2 = :V1'
  })

  t.end()
})

test('operand = operand<float>', t => {
  const r = queryParser('beep = 10.025')

  t.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { N: '10.025' } },
    ExpressionAttributeNames: { '#V2': 'beep' },
    Expression: '#V2 = :V1'
  })

  t.end()
})

test('operand = operand<string>', t => {
  const r = queryParser('beep = \'foo\'')

  t.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { S: 'foo' } },
    ExpressionAttributeNames: { '#V2': 'beep' },
    Expression: '#V2 = :V1'
  })

  t.end()
})

test('operand = operand<binary>', t => {
  const r = queryParser('beep = <foo>')

  t.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { B: 'foo' } },
    ExpressionAttributeNames: { '#V2': 'beep' },
    Expression: '#V2 = :V1'
  })

  t.end()
})

test('operand <> operand', t => {
  const r = queryParser('beep <> 10')

  t.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { N: '10' } },
    ExpressionAttributeNames: { '#V2': 'beep' },
    Expression: '#V2 <> :V1'
  })

  t.end()
})

test('operand string conditional', t => {
  const r = queryParser(`hash = 'x' and range = 'y'`)

  t.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { S: 'x' }, ':V2': { S: 'y' } },
    ExpressionAttributeNames: { '#V3': 'hash', '#V4': 'range' },
    Expression: '#V3 = :V1 and #V4 = :V2'
  })
  t.end()
})

test('operand operator operand conditional', t => {
  const r = queryParser('beep > 10 AND boop = \'barf\'')

  t.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { S: 'barf' }, ':V2': { N: '10' } },
    ExpressionAttributeNames: { '#V3': 'beep', '#V4': 'boop' },
    Expression: '#V3 > :V2 AND #V4 = :V1'
  })

  t.end()
})

test('...respects parens', t => {
  const r = queryParser('beep > 10 AND (boop = \'barf\')')

  t.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { S: 'barf' }, ':V2': { N: '10' } },
    ExpressionAttributeNames: { '#V3': 'beep', '#V4': 'boop' },
    Expression: '#V3 > :V2 AND (#V4 = :V1)'
  })

  t.end()
})

test('binary value', t => {
  const r = queryParser('foo = <SGVsbG8sIFdvcmxkLgo=>')

  t.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { B: 'SGVsbG8sIFdvcmxkLgo=' } },
    ExpressionAttributeNames: { '#V2': 'foo' },
    Expression: '#V2 = :V1'
  })

  t.end()
})

test('single value set', t => {
  const r = queryParser('SET foo = \'bar\'')

  t.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { S: 'bar' } },
    ExpressionAttributeNames: { '#V2': 'foo' },
    Expression: 'SET #V2 = :V1'
  })

  t.end()
})

test('multi value set', t => {
  const r = queryParser('SET count = count + 200, foo = 10')

  t.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { N: '200' }, ':V2': { N: '10' } },
    ExpressionAttributeNames: { '#V3': 'count', '#V4': 'count', '#V5': 'foo' },
    Expression: 'SET #V3 = #V4 + :V1, #V5 = :V2'
  })

  t.end()
})

test('multi value set with function', t => {
  const r = queryParser('SET count = if_not_exists(count, 0) + 1')

  t.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { N: '0' }, ':V2': { N: '1' } },
    ExpressionAttributeNames: { '#V3': 'count', '#V4': 'count' },
    Expression: 'SET #V4 = if_not_exists(#V3, :V1) + :V2'
  })

  t.end()
})

test('is null value', t => {
  const r = queryParser('foo = null')

  t.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { NULL: true } },
    ExpressionAttributeNames: { '#V2': 'foo' },
    Expression: '#V2 = :V1'
  })

  t.end()
})

test('is true value', t => {
  const r = queryParser('foo = true')

  t.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { BOOL: true } },
    ExpressionAttributeNames: { '#V2': 'foo' },
    Expression: '#V2 = :V1'
  })

  t.end()
})

test('is false value', t => {
  const r = queryParser('foo = false')

  t.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { BOOL: false } },
    ExpressionAttributeNames: { '#V2': 'foo' },
    Expression: '#V2 = :V1'
  })

  t.end()
})

test('operand operator operand with parens', t => {
  const r = queryParser('(foo = null)')

  t.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { NULL: true } },
    ExpressionAttributeNames: { '#V2': 'foo' },
    Expression: '(#V2 = :V1)'
  })

  t.end()
})

test('function(path, value<string>)', t => {
  const r = queryParser('contains(beep.boop[1], \'bar\')')

  t.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { S: 'bar' } },
    ExpressionAttributeNames: { '#V2': 'beep', '#V3': 'boop' },
    Expression: 'contains(#V2.#V3[1], :V1)'
  })

  t.end()
})

test('function(path, value<number>)', t => {
  const r = queryParser('contains(beep.boop[1], 100)')

  t.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { N: '100' } },
    ExpressionAttributeNames: { '#V2': 'beep', '#V3': 'boop' },
    Expression: 'contains(#V2.#V3[1], :V1)'
  })

  t.end()
})

test('function(path, value<float>)', t => {
  const r = queryParser('contains(beep.boop[1], 100.00005)')

  t.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { N: '100.00005' } },
    ExpressionAttributeNames: { '#V2': 'beep', '#V3': 'boop' },
    Expression: 'contains(#V2.#V3[1], :V1)'
  })

  t.end()
})

test('function(path, value<binary>)', t => {
  const r = queryParser('contains(beep.boop[1], <bar>)')

  t.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { B: 'bar' } },
    ExpressionAttributeNames: { '#V2': 'beep', '#V3': 'boop' },
    Expression: 'contains(#V2.#V3[1], :V1)'
  })

  t.end()
})

test('function(path)', t => {
  const r = queryParser('size(foo.bar)')

  t.deepEqual(r, {
    ExpressionAttributeValues: {},
    ExpressionAttributeNames: { '#V1': 'foo', '#V2': 'bar' },
    Expression: 'size(#V1.#V2)'
  })

  t.end()
})

test('function(path[i])', t => {
  const r = queryParser('size(foo.bar[1])')

  t.deepEqual(r, {
    ExpressionAttributeValues: {},
    ExpressionAttributeNames: { '#V1': 'foo', '#V2': 'bar' },
    Expression: 'size(#V1.#V2[1])'
  })

  t.end()
})

test('...combined with function', t => {
  const r = queryParser('size(foo.bar) AND contains(quxx.bar, 100)')

  t.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { N: '100' } },
    ExpressionAttributeNames: { '#V2': 'foo', '#V3': 'bar', '#V4': 'quxx', '#V5': 'bar' },
    Expression: 'size(#V2.#V3) AND contains(#V4.#V5, :V1)'
  })

  t.end()
})

test('...combined with index', t => {
  const r = queryParser('size(foo.bar[100]) AND contains(quxx.bar[100], 100)')

  t.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { N: '100' } },
    ExpressionAttributeNames: { '#V2': 'foo', '#V3': 'bar', '#V4': 'quxx', '#V5': 'bar' },
    Expression: 'size(#V2.#V3[100]) AND contains(#V4.#V5[100], :V1)'
  })

  t.end()
})

test('between', t => {
  const r = queryParser('foo.borp[1] BETWEEN 10 AND 20')

  t.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { N: '10' }, ':V2': { N: '20' } },
    ExpressionAttributeNames: { '#V3': 'foo', '#V4': 'borp' },
    Expression: '#V3.#V4[1] BETWEEN :V1 AND :V2'
  })

  t.end()
})

test('delete value<string>', t => {
  const r = queryParser('DELETE bop \'quxx\'')

  t.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { S: 'quxx' } },
    ExpressionAttributeNames: { '#V2': 'bop' },
    Expression: 'DELETE #V2 :V1'
  })

  t.end()
})

test('delete value<number>', t => {
  const r = queryParser('DELETE burp.borp[1] 10')

  t.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { N: '10' } },
    ExpressionAttributeNames: { '#V2': 'burp', '#V3': 'borp' },
    Expression: 'DELETE #V2.#V3[1] :V1'
  })

  t.end()
})

test('remove value<number>', t => {
  const r = queryParser('REMOVE burp.borp[1] 2')

  t.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { N: '2' } },
    ExpressionAttributeNames: { '#V2': 'burp', '#V3': 'borp' },
    Expression: 'REMOVE #V2.#V3[1] :V1'
  })

  t.end()
})

test('add value<number>', t => {
  const r = queryParser('ADD burp.borp[1] 2')

  t.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { N: '2' } },
    ExpressionAttributeNames: { '#V2': 'burp', '#V3': 'borp' },
    Expression: 'ADD #V2.#V3[1] :V1'
  })

  t.end()
})

test('in list of number', t => {
  const r = queryParser('foo IN (10 20 30)')

  t.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { N: '10' }, ':V2': { N: '20' }, ':V3': { N: '30' } },
    ExpressionAttributeNames: { '#V4': 'foo' },
    Expression: '#V4 IN (:V1 :V2 :V3)'
  })

  t.end()
})

test('in list of string', t => {
  const r = queryParser('foo IN (\'foo\' \'bar\' \'bazz\')')

  t.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { S: 'foo' }, ':V2': { S: 'bar' }, ':V3': { S: 'bazz' } },
    ExpressionAttributeNames: { '#V4': 'foo' },
    Expression: '#V4 IN (:V1 :V2 :V3)'
  })

  t.end()
})

test('in list of binary', t => {
  const r = queryParser('foo IN (<beep> <boop> <burp>)')

  t.deepEqual(r, {
    ExpressionAttributeValues: { ':V2': { B: 'beep' }, ':V3': { B: 'boop' }, ':V4': { B: 'burp' } },
    ExpressionAttributeNames: { '#V1': 'foo' },
    Expression: '#V1 IN (:V2 :V3 :V4)'
  })

  t.end()
})

test('in with path and path index', t => {
  const r = queryParser('foo.bar[1] IN (10 20 30)')

  t.deepEqual(r, {
    ExpressionAttributeValues: { ':V1': { N: '10' }, ':V2': { N: '20' }, ':V3': { N: '30' } },
    ExpressionAttributeNames: { '#V4': 'foo', '#V5': 'bar' },
    Expression: '#V4.#V5[1] IN (:V1 :V2 :V3)'
  })

  t.end()
})

test('in with and clause', t => {
  const r = queryParser('(ProductCategory IN (<foo> <b>)) and (Price BETWEEN 1 and 10)')

  t.deepEqual(r, {
    ExpressionAttributeValues: {
      ':V1': { N: '1' },
      ':V2': { N: '10' },
      ':V5': { B: 'foo' },
      ':V6': { B: 'b' }
    },
    ExpressionAttributeNames: { '#V3': 'Price', '#V4': 'ProductCategory' },
    Expression: '(#V4 IN (:V5 :V6)) and (#V3 BETWEEN :V1 and :V2)'
  })

  t.end()
})
