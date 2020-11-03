const { queryParser, toJSON, toDynamoJSON } = require('../src/util')
const test = require('@pre-bundled/tape')

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

  const expected = '{"str":{"S":"string"},"int":{"N":"1"},"float":{"N":"1.1"},"obja":{"M":{"objb":{"M":{"str":{"S":"str"},"int":{"N":"1"}}},"arr":{"SS":["str"]},"ab":{"BS":[{"type":"Buffer","data":[0]}]}}},"no":{"BOOL":false},"yes":{"BOOL":true}}'

  t.ok(expected === JSON.stringify(j))
  t.ok(JSON.stringify(toJSON(j)) === JSON.stringify(o))
  t.end()
})

test('large object', t => {
  const o = require('./fixture.json')
  const str = JSON.stringify(toDynamoJSON(o))
  const expected = '{"originalOrder":{"M":{"id":{"S":"04df2b4d-6044-ae29-df11-4bd095d9c306"},"size":{"S":"10.00000000"},"asset":{"S":"BTC-USD"},"side":{"S":"buy"},"stp":{"S":"dc"},"type":{"S":"market"},"postOnly":{"BOOL":false},"ctime":{"S":"2020-05-07T15:58:30.000000Z"},"fillFees":{"S":"0.0000000000000000"},"filledSize":{"S":"0.00000000"},"executedValue":{"S":"0.0000000000000000"},"status":{"S":"pending"},"settled":{"BOOL":true},"_subscription":{"S":"volumeSpike-test-assert-buy-true"},"_destination":{"S":"Coinbase"},"_marketdata":{"M":{"asset":{"S":"USD-BTC"},"exchange":{"S":"coinbase"},"price":{"L":[{"M":{"price":{"S":"0"},"timestamp":{"S":"2020-05-07T15:58:33.000Z"}}}]},"timestamp":{"S":"2020-05-07T15:58:21.000Z"},"aggregateCount":{"N":"13"},"volume":{"M":{"buy":{"N":"0"},"sell":{"N":"6.69776927772909"},"total":{"N":"6.69776927772909"}}},"avgVolume":{"N":"14812.93756"},"sumVolume":{"N":"18940.469469277727"},"totalVolumeRatio":{"N":"1.278643712130636"},"netDirectionVolumeRatio":{"NULL":true}}}}}}'
  t.equal(str, expected)
  t.end()
})
