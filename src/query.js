const TYPED_VARIABLES_RE = /(B|BOOL|BS|L|M|N|NS|NULL|S|SS)\(/

exports.queryParser = function (source) {
  if (!source.match(TYPED_VARIABLES_RE)) {
    return source // has no typed variables
  }

  source = source.slice()

  let variableIndex = 0
  let openStates = 0
  let match = null
  let expression = ''
  const attributeValues = {}

  while (source.length) {
    match = source.match(TYPED_VARIABLES_RE)
    if (!match) break

    ++variableIndex
    ++openStates
    const index = match.index + match[0].length
    expression += source.slice(0, match.index)
    source = source.slice(index)
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

    expression += name
    const type = match[1]
    attributeValues[name] = { [type]: value.join('') }
  }

  expression += source

  return { attributeValues, expression }
}

exports.query = async function (dsl, opts = {}) {
  const {
    expression: KeyConditionExpression,
    attributeValues: ExpressionAttributeValues
  } = this.queryParser(dsl)

  const params = {
    TableName: this.meta.TableName,
    ExpressionAttributeValues,
    KeyConditionExpression,
    ...opts
  }

  return {
    [Symbol.asyncIterator] () {
      return this
    },
    //
    // FilterExpression
    // https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.html#FilteringResults
    //
    filter: async dsl => {
      const {
        attributeValues: ExpressionAttributeValues,
        expression: FilterExpression
      } = this.queryParser(dsl)

      params.FilterExpression = FilterExpression
      params.ExpressionAttributeValues = ExpressionAttributeValues
    },
    //
    // ProjectionExpression
    // https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.Attributes.html
    //
    properties: async dsl => {
      params.ProjectionExpression = dsl
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
