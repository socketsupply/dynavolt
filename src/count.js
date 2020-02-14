exports.count = async function (opts) {
  const params = {
    TableName: this.meta.TableName,
    Select: 'COUNT',
    ...opts
  }

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
