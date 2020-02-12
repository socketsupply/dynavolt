exports.get = async function (hash, range, opts = {}) {
  if (typeof range !== 'string') {
    opts = range || {}
  }

  const params = {
    Key: this.createKeyProperties(hash, range),
    TableName: this.meta.TableName,
    ...opts
  }

  let data = null

  try {
    data = await this.db.getItem(params).promise()
  } catch (err) {
    return { err }
  }

  return { data: this.toJSON(data.Item) }
}
