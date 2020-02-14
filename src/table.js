class Table {
  constructor (AWS, dbOpts = {}, opts = {}) {
    this.disableATD = opts.disableATD
    this.db = new AWS.DynamoDB({ ...dbOpts, ...opts })
  }

  createKeyProperties (hash, range) {
    const o = {
      [this.hashKey]: { [this.hashType]: hash }
    }

    if (range) {
      o[this.rangeKey] = { [this.rangeType]: range }
    }

    return o
  }
}

Object.assign(Table.prototype, {
  ...require('./ttl'),
  ...require('./batch'),
  ...require('./update'),
  ...require('./count'),
  ...require('./delete'),
  ...require('./get'),
  ...require('./put'),
  ...require('./query'),
  ...require('./util')
})

module.exports = { Table }
