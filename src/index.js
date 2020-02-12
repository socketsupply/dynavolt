const assert = require('assert')

class Table {
  constructor (AWS, opts = {}) {
    assert(AWS, 'the first argument must be a reference to the aws-sdk')

    this.disableATD = opts.disableATD
    this.sep = this.sep || '/'
    this.TYPE_RE = /\[object (\w+)\]/
    this.db = new AWS.DynamoDB(opts)
  }

  getDataType (v) {
    return Object.prototype.toString.call(v).match(this.TYPE_RE)[1]
  }

  getDynamoDataType (v) {
    switch (this.getDataType(v)) {
      case 'Array':
        if (this.getDataType(v[0]) === 'Uint8Array') return 'BS'
        if (this.getDataType(v[0]) === 'String') return 'NS'
        if (this.getDataType(v[0]) === 'Object') return 'L'
        break
      case 'Object': return 'M'
      case 'String': return 'S'
      case 'Null': return 'NULL'
      case 'Boolean': return 'BOOL'
      case 'Number': return 'N'
      case 'Uint8Array': return 'B'
    }
  }

  createKeyProperties (hash, range) {
    if (this._createKeyProperties) {
      return this._createKeyProperties(hash, range)
    }

    const schema = this.meta.KeySchema
    const defs = this.meta.AttributeDefinitions

    this.hashKey = schema[0].AttributeName
    this.hashType = defs.find(d => d.AttributeName === this.hashKey)

    if (range) {
      this.rangeKey = schema[1].AttributeName
      this.rangeType = defs.find(d => d.AttributeName === this.rangeKey)
    }

    this._createKeyProperties = (hash, range) => {
      const o = {
        [this.hashKey]: { [this.hashType]: hash }
      }

      if (range) {
        o[this.rangeKey] = { [this.rangeType]: range }
      }

      return o
    }

    return this._createKeyProperties(hash, range)
  }

  toDynamoJSON (original) {
    const copy = JSON.parse(JSON.stringify(original))

    const convert = (copy, original) => {
      for (const [k, v] of Object.entries(copy)) {
        const type = this.getDataType(original[k])

        if (['Object', 'Array'].includes(type)) {
          copy[k] = convert(v, original[k])
        }

        const value = type === 'Uint8Array' ? original[k] : copy[k]
        copy[k] = { [this.getDynamoDataType(original[k])]: value }
      }
      return copy
    }

    return convert(copy, original)
  }

  toJSON (o) {
    const convert = o => {
      for (const [k, v] of Object.entries(o)) {
        const type = Object.keys(o[k])[0]

        if (['L', 'M', 'BS', 'LS', 'NS'].includes(type)) {
          o[k] = convert(Object.values(v)[0])
          continue
        }

        o[k] = Object.values(o[k])[0]
      }

      return o
    }

    return convert(o)
  }
}

Object.assign(Table.prototype, {
  ...require('./create'),
  ...require('./open'),
  ...require('./ttl'),
  ...require('./batch'),
  ...require('./update'),
  ...require('./count'),
  ...require('./delete'),
  ...require('./get'),
  ...require('./put'),
  ...require('./query')
})

module.exports = Table
