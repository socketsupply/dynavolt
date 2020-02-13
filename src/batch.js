exports.batchWrite = async function (batch, opts = {}) {
  const ops = batch.map(op => {
    const Value = op.put || op.delete

    const {
      [this.hashKey]: hash,
      [this.rangeKey]: range
    } = Value

    const Key = this.createKeyProperties(hash, range)

    if (op.put) {
      delete Value[this.hashKey]
      delete Value[this.rangeKey]

      return {
        PutRequest: {
          Item: {
            ...Key,
            ...this.toDynamoJSON(Value)
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
  const ops = batch.map(op => {
    const {
      [this.hashKey]: hash,
      [this.rangeKey]: range
    } = op

    return this.createKeyProperties(hash, range)
  })

  const params = {
    RequestItems: {
      [this.meta.TableName]: ops
    },
    ...opts
  }

  try {
    await this.db.batchGetItem(params).promise()
  } catch (err) {
    return { err }
  }
}
