
//
// db.setTTL('ttl', isEnabled)
//
exports.setTTL = async function (AttributeName = 'ttl', Enabled = true) {
  if (!this.meta && this.meta.TableName) {
    return { err: new Error('No table open') }
  }

  let data = {}
  let isEnabled = false
  const TableName = this.meta.TableName

  try {
    data = await this.db.describeTimeToLive({ TableName }).promise()

    isEnabled = (
      data.TimeToLiveDescription &&
      data.TimeToLiveDescription.TimeToLiveStatus &&
      data.TimeToLiveDescription.TimeToLiveStatus === 'ENABLED'
    )
  } catch (err) {
    return { err }
  }

  if (isEnabled && Enabled) {
    return { table: this }
  }

  const params = {
    TableName,
    TimeToLiveSpecification: {
      AttributeName,
      Enabled
    }
  }

  try {
    await this.db.updateTimeToLive(params).promise()
  } catch (err) {
    return { err }
  }

  return { table: this }
}
