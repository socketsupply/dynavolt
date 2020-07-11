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
  const expected = '{"originalOrder":{"M":{"id":{"S":"04df2b4d-6044-ae29-df11-4bd095d9c306"},"size":{"S":"10.00000000"},"asset":{"S":"BTC-USD"},"side":{"S":"buy"},"stp":{"S":"dc"},"type":{"S":"market"},"postOnly":{"BOOL":false},"ctime":{"S":"2020-05-07T15:58:30.000000Z"},"fillFees":{"S":"0.0000000000000000"},"filledSize":{"S":"0.00000000"},"executedValue":{"S":"0.0000000000000000"},"status":{"S":"pending"},"settled":{"BOOL":true},"_subscription":{"S":"volumeSpike-test-assert-buy-true"},"_destination":{"S":"Coinbase"},"_marketdata":{"M":{"asset":{"S":"USD-BTC"},"exchange":{"S":"coinbase"},"price":{"L":[{"M":{"price":{"S":"0"},"timestamp":{"S":"2020-05-07T15:58:33.000Z"}}}]},"timestamp":{"S":"2020-05-07T15:58:21.000Z"},"aggregateCount":{"N":"13"},"volume":{"M":{"buy":{"N":"0"},"sell":{"N":"6.69776927772909"},"total":{"N":"6.69776927772909"}}},"avgVolume":{"N":"14812.93756"},"sumVolume":{"N":"18940.469469277727"},"totalVolumeRatio":{"N":"1.278643712130636"},"netDirectionVolumeRatio":{"NULL":null}}},"orders":{"L":[{"M":{"key":{"S":"2ÿUSD-BTCÿ593432c8-0d22-75e2-1113-18f8173adcd4"},"id":{"S":"593432c8-0d22-75e2-1113-18f8173adcd4"}}}]},"fills":{"L":[{"M":{"id":{"N":"1"},"size":{"N":"10"},"asset":{"S":"BTC-USD"},"price":{"S":"10000.00000000"},"side":{"S":"buy"},"liquidity":{"S":"T"},"fee":{"S":"0.00025"},"ctime":{"S":"2020-05-07T15:58:30.000000Z"},"orderId":{"S":"04df2b4d-6044-ae29-df11-4bd095d9c306"},"settled":{"BOOL":true},"targetLimitPrice":{"N":"10500"},"stopLossPrice":{"N":"9800"},"trailingStopLossTriggerPrice":{"N":"10100"},"trailingStopLossPriceHistory":{"undefined":[]},"_subscription":{"S":"volumeSpike-test-assert-buy-true"},"_destination":{"S":"Coinbase"},"key":{"S":"3ÿUSD-BTCÿ04df2b4d-6044-ae29-df11-4bd095d9c306ÿ1"},"open":{"BOOL":false}}}]}}},"closingOrders":{"L":[{"M":{"id":{"S":"593432c8-0d22-75e2-1113-18f8173adcd4"},"size":{"S":"10.00000000"},"asset":{"S":"BTC-USD"},"side":{"S":"sell"},"stp":{"S":"dc"},"type":{"S":"limit"},"postOnly":{"BOOL":false},"ctime":{"S":"2020-05-07T15:58:50.000000Z"},"fillFees":{"S":"0.0000000000000000"},"filledSize":{"S":"0.00000000"},"executedValue":{"S":"0.0000000000000000"},"status":{"S":"pending"},"settled":{"BOOL":false},"origin":{"M":{"fillId":{"N":"1"},"orderId":{"S":"04df2b4d-6044-ae29-df11-4bd095d9c306"},"cause":{"S":"SLO"}}},"sold":{"BOOL":true},"_subscription":{"S":"volumeSpike-test-assert-buy-true"},"_marketdata":{"M":{"exchange":{"S":"coinbase"},"asset":{"S":"USD-BTC"},"timestamp":{"S":"2020-05-07T15:58:34.000000Z"},"price":{"S":"9960"},"volume":{"M":{"buy":{"N":"0"},"sell":{"S":"5.67890303535387"},"total":{"S":"5.67890303535387"}}}}},"fills":{"L":[{"M":{"id":{"N":"2"},"size":{"N":"10"},"asset":{"S":"BTC-USD"},"price":{"S":"9799.00000000"},"side":{"S":"sell"},"liquidity":{"S":"T"},"fee":{"S":"0.00025"},"ctime":{"S":"2020-05-07T15:58:50.000000Z"},"orderId":{"S":"04df2b4d-6044-ae29-df11-4bd095d9c306"},"settled":{"BOOL":true},"targetLimitPrice":{"N":"10288.95"},"stopLossPrice":{"N":"9603.02"},"trailingStopLossTriggerPrice":{"N":"9896.99"},"trailingStopLossPriceHistory":{"undefined":[]},"_subscription":{"S":"volumeSpike-test-assert-buy-true"},"_destination":{"S":"Coinbase"},"key":{"S":"3ÿUSD-BTCÿ593432c8-0d22-75e2-1113-18f8173adcd4ÿ2"},"open":{"BOOL":true}}}]},"aggregate":{"M":{"size":{"N":"10"},"price":{"N":"9799"},"fee":{"S":"0.00025"}}}}}]},"summary":{"M":{"subscription":{"S":"volumeSpike-test-assert-buy-true"},"aggregateCloseSize":{"N":"10"},"isNetTradeZero":{"BOOL":true},"originalOrderCTime":{"N":"1588867110000"},"originalOrderFillCount":{"N":"1"},"originalOrderTotalCost":{"N":"100000"},"originalOrderTotalSize":{"N":"10"},"originalOrderTotalFee":{"S":"0.00025"},"closingOrdersCTime":{"N":"1588867130000"},"closingOrdersOrderCount":{"N":"1"},"closingOrdersFillCount":{"N":"1"},"closingOrdersTotalProceeds":{"N":"97990"},"closingOrdersTotalFee":{"S":"00.00025"},"pnl":{"N":"-2010"},"tradeDuration":{"N":"20000"},"version":{"S":"1.0.0"}}}}'
  t.equal(str, expected)
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
  const o = queryParser('foo = N(1(00)')
  t.ok(o.err, 'should fail')
  t.end()
})
