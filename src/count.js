exports.count = async function (isManualCount, opts) {
  const params = {
    TableName: this.meta.TableName,
    ...opts
  }

  if (!isManualCount) {
    let data = {}

    try {
      data = await this.db.describeTable(params).promise()
    } catch (err) {
      return { err }
    }

    return { count: data.Table.ItemCount }
  }

  params.Select = 'COUNT'

  let count = 0

  while (true) {
    let data = null

    try {
      data = await this.db.scan(params).promise()
    } catch (err) {
      return { err }
    }

    count += data.Count

    if (!data.LastEvaluatedKey) {
      break
    }

    params.ExclusiveStartKey = data.LastEvaluatedKey
  }

  return { count, LastEvaluatedKey: params.LastEvaluatedKey }
}
