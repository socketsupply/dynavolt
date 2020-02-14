exports.batchWrite = async function (batch, opts = {}) {
  const ops = batch.map(({ 0: hash, 2: range, 3: value }) => {
    const Key = this.createKeyProperties(hash, range)

    if (value) {
      return {
        PutRequest: {
          Item: {
            ...Key,
            ...this.toDynamoJSON(value)
          }
        }
      }
    }

    return {
      DeleteRequest: { Key }
    }
  })

  {
    const params = {
      RequestItems: {
        [this.meta.TableName]: ops,
        ...opts
      }
    }

    try {
      await this.db.batchWriteItem(params).promise()
    } catch (err) {
      return { err }
    }
  }

  return {}
}

exports.batchRead = async function (batch, opts = {}) {
  const params = {
    RequestItems: {
      [this.meta.TableName]: batch.map(({ 0: hash, 1: range }) => {
        return this.createKeyProperties(hash, range)
      })
    },
    ...opts
  }

  try {
    await this.db.batchGetItem(params).promise()
  } catch (err) {
    return { err }
  }
}
