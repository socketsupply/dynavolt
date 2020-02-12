exports.put = async function (hash, range, props = {}) {
  if (typeof range !== 'string') {
    props = range || {}
  }

  const params = {
    Item: {
      ...this.createKeyProperties(hash, range),
      ...this.disableATD ? props : this.toDynamoJSON(props)
    },
    TableName: this.meta.TableName
  }
 
  try {
    await this.db.putItem(params).promise()
  } catch (err) {
    return { err }
  }
}
