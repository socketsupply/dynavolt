const { queryParser, toJSON, toDynamoJSON } = require('../src/util')
const test = require('tape')

test('create dynamo json from regular json', t => {
  const o = {
    str: 'string',
    int: 1,
    float: 1.1,
    obja: {
      objb: {
        str: 'str',
        int: 1
      },
      arr: ['str'],
      ab: [Buffer.alloc(1)]
    },
    no: false,
    yes: true
  }

  const j = toDynamoJSON(o)
  const expected = '{"str":{"S":"string"},"int":{"N":"1"},"float":{"N":"1.1"},"obja":{"M":{"objb":{"M":{"str":{"S":"str"},"int":{"N":"1"}}},"arr":{"NS":[{"S":"str"}]},"ab":{"BS":[{"B":{"type":"Buffer","data":[0]}}]}}},"no":{"BOOL":false},"yes":{"BOOL":true}}'

  t.ok(expected === JSON.stringify(j))
  t.ok(JSON.stringify(toJSON(j)) === JSON.stringify(o))
  t.end()
})

test('convert dsl to dynamo expression and extract expression attribute values', t => {
  const expected = JSON.stringify({ ':v1': { N: '100' }, ':v2': { S: 'hello' } })
  const { expression, attributeValues } = queryParser('foo = N(100) AND S(hello)')
  t.ok(expected === JSON.stringify(attributeValues))
  t.ok(expression === 'foo = :v1 AND :v2')
  t.end()
})

test('same as last test but tests nesting of parens', t => {
  const expected = JSON.stringify({ ':v3': { N: '1(0)0' } })
  const { expression, attributeValues } = queryParser('foo = N(1(0)0)')
  t.ok(expected === JSON.stringify(attributeValues))
  t.ok(expression === 'foo = :v3')
  t.end()
})

test('mix of names and values', t => {
  const expected = '{"attributeValues":{":v5":{"S":"foo"}},"attributeNames":{"#v4":"range"},"expression":"#v4 = :v5"}'
  const o = queryParser('$(range) = S(foo)')
  t.ok(expected === JSON.stringify(o))
  t.end()
})

test('unmatched params should throw', t => {
  try {
    queryParser('foo = N(1(00)')
  } catch (err) {
    t.ok(err, 'should fail')
    t.end()
  }
})
