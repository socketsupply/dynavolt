const Table = require('../src')
const assert = require('assert')

const t = new Table({ DynamoDB: function () {} })

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
  }
}

const j = t.toDynamoJSON(o)

const expected = '{"str":{"S":"string"},"int":{"N":1},"float":{"N":1.1},"obja":{"M":{"objb":{"M":{"str":{"S":"str"},"int":{"N":1}}},"arr":{"NS":[{"S":"str"}]},"ab":{"BS":[{"B":{"type":"Buffer","data":[0]}}]}}}}'

assert(expected === JSON.stringify(j))
assert(JSON.stringify(o) === JSON.stringify(t.toJSON(j)))
