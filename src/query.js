const TYPED_VARIABLES_RE = /(B|BOOL|BS|L|M|N|NS|NULL|S|SS)\(/

exports.queryParser = function (source) {
  if (!source.match(TYPED_VARIABLES_RE)) {
    return source // has no typed variables
  }

  source = source.slice()

  let variableIndex = 0
  let openStates = 0
  let match = null
  const ExpressionAttributeValues = {}

  while (source.length) {
    match = source.match(TYPED_VARIABLES_RE)
    if (!match) break

    ++variableIndex
    ++openStates
    source = source.slice(match.index + match[0].length)
    const name = `:v${variableIndex}`
    const value = []

    while (true) {
      const ch = source[0]
      source = source.slice(1)

      if (ch === '(') ++openStates
      if (ch === ')') --openStates

      if (openStates === 0) break

      value.push(ch)

      if (openStates && !ch) {
        throw new Error('End of string before closing paren')
      }
    }

    const type = match[1]
    ExpressionAttributeValues[name] = { [type]: value.join('') }
  }

  return ExpressionAttributeValues
}

exports.query = async function (dsl, opts = {}) {
  //
  // ProjectionExpression
  // https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.Attributes.html
  //

  //
  // FilterExpression
  // https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.html#FilteringResults
  //
  const params = {
    TableName: this.meta.TableName,
    ExpressionAttributeValues: this.queryParser(dsl),
    ...opts
  }

  return {
    [Symbol.asyncIterator] () {
      return this
    },
    next: async () => {
      let res = null

      try {
        res = await this.db.query(params).promise()
      } catch (err) {
        throw err
      }

      return res
    }
  }
}
