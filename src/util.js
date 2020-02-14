const TYPE_RE = /\[object (\w+)\]/
const TYPED_VARIABLES_RE = /(B|BOOL|BS|L|M|N|NS|NULL|S|SS)\(/

function getDataType (v) {
  return Object.prototype.toString.call(v).match(TYPE_RE)[1]
}

function getDynamoDataType (v) {
  switch (getDataType(v)) {
    case 'Array':
      if (getDataType(v[0]) === 'Uint8Array') return 'BS'
      if (getDataType(v[0]) === 'String') return 'NS'
      if (getDataType(v[0]) === 'Object') return 'L'
      break
    case 'Object': return 'M'
    case 'String': return 'S'
    case 'Null': return 'NULL'
    case 'Boolean': return 'BOOL'
    case 'Number': return 'N'
    case 'Uint8Array': return 'B'
  }
}

function toDynamoJSON (original) {
  const copy = JSON.parse(JSON.stringify(original))

  const convert = (copy, original) => {
    for (const [k, v] of Object.entries(copy)) {
      const type = getDataType(original[k])

      if (['Object', 'Array'].includes(type)) {
        copy[k] = convert(v, original[k])
      }

      const value = type === 'Uint8Array' ? original[k] : copy[k]
      copy[k] = { [getDynamoDataType(original[k])]: value }
    }
    return copy
  }

  return convert(copy, original)
}

function toJSON (o) {
  const convert = o => {
    for (const [k, v] of Object.entries(o)) {
      const type = Object.keys(o[k])[0]

      if (['L', 'M', 'BS', 'LS', 'NS'].includes(type)) {
        o[k] = convert(Object.values(v)[0])
        continue
      }

      o[k] = Object.values(o[k])[0]
    }

    return o
  }

  return convert(o)
}

function queryParser (source) {
  if (!source.match(TYPED_VARIABLES_RE)) {
    return source // has no typed variables
  }

  source = source.slice()

  if (typeof queryParser.variableIndex === 'undefined') {
    queryParser.variableIndex = 0
  }

  let openStates = 0
  let match = null
  let expression = ''
  const attributeValues = {}

  while (source.length) {
    match = source.match(TYPED_VARIABLES_RE)
    if (!match) break

    ++queryParser.variableIndex
    ++openStates
    const index = match.index + match[0].length
    expression += source.slice(0, match.index)
    source = source.slice(index)
    const name = `:v${queryParser.variableIndex}`
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

module.exports = {
  queryParser,
  getDataType,
  getDynamoDataType,
  toJSON,
  toDynamoJSON
}
