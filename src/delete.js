exports.delete = async function (hash, range, props = {}) {
  if (typeof range !== 'string') {
    props = range || {}
  }

  const params = {
    Key: this.createKeyProperties(hash, range),
    TableName: this.meta.TableName
  }

  try {
    await this.db.deleteItem(params).promise()
  } catch (err) {
    return { err }
  }

  return {}
}
