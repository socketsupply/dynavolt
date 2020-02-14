exports.put = async function (hash, range, props = {}, opts = {}) {
  if (typeof range !== 'string') {
    opts = props || {}
    props = range || {}
  }

  const params = {
    Item: {
      ...this.createKeyProperties(hash, range),
      ...this.disableATD ? props : this.toDynamoJSON(props)
    },
    TableName: this.meta.TableName,
    ...opts
  }
 
  try {
    await this.db.putItem(params).promise()
  } catch (ex) {
    const err = new Error(ex.message)
    return { err }
  }

  return {}
}

exports.putNew = async function (hash, range, props = {}, opts = {}) {
  const condition = [`attribute_not_exists(${this.hashKey})`]

  if (this.rangeKey) {
    condition.push('AND', `attribute_not_exists(${this.rangeKey})`)
  }

  opts.ConditionExpression = condition.join(' ')
  return exports.put.call(this, hash, range, props, opts)
}
