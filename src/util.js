const TYPE_RE = /\[object (\w+)\]/
const TYPED_VARIABLES_RE = /(B|BOOL|BS|L|M|N|NS|NULL|S|SS|\$)\(/

function getDataType (v) {
  return Object.prototype.toString.call(v).match(TYPE_RE)[1]
}

function getDynamoDataType (v) {
  switch (getDataType(v)) {
    case 'Array':
      if (getDataType(v[0]) === 'Uint8Array') return 'BS'
      if (getDataType(v[0]) === 'String') return 'SS'
      if (getDataType(v[0]) === 'Number') return 'NS'
      if (getDataType(v[0]) === 'Object') return 'L'
      if (getDataType(v[0]) === 'Undefined') return 'L'
      break
    case 'Object': return 'M'
    case 'String': return 'S'
    case 'Date': return 'S'
    case 'Null': return 'NULL'
    case 'Undefined': return 'NULL'
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

      if (type === 'Object') {
        copy[k] = convert(v, original[k])
      }

      let value = copy[k]

      if (type === 'Array') {
        const typeOfFirstItem = getDataType(original[k][0])

        if (['Object', 'Array'].includes(typeOfFirstItem)) {
          value = convert(v, original[k])
        } else {
          value = original[k]
        }
      }

      if (type === 'Number') value = String(value)
      if (type === 'Date') value = String(value)
      if (type === 'Null') value = true

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

      if (type === 'N') {
        o[k] = Number(o[k])
      }
    }

    return o
  }

  return convert(o)
}

function recast (type, value) {
  switch (type) {
    case 'BOOL': return value === 'true'
    case 'B': return Buffer.from(value)
    default: return value
  }
}

function queryParser (source) {
  if (!source.match(TYPED_VARIABLES_RE)) {
    return { expression: source } // has no typed variables
  }

  source = source.slice()

  if (typeof queryParser.variableIndex === 'undefined') {
    queryParser.variableIndex = 0
  }

  let openStates = 0
  let match = null
  let expression = ''
  const attributeValues = {}
  const attributeNames = {}

  while (source.length) {
    match = source.match(TYPED_VARIABLES_RE)
    if (!match) break

    ++queryParser.variableIndex
    ++openStates

    const index = match.index + match[0].length
    const type = match[1]
    const isVariable = type === '$'
    const symbol = isVariable ? '#' : ':'
    const name = `${symbol}v${queryParser.variableIndex}`
    const value = []

    expression += source.slice(0, match.index)
    source = source.slice(index)

    while (true) {
      const ch = source[0]
      source = source.slice(1)

      if (ch === '(') ++openStates
      if (ch === ')') --openStates

      if (openStates === 0) break

      value.push(ch)

      if (openStates && !ch) {
        return {
          err: 'End of string before closing paren',
          position: source.length
        }
      }
    }

    expression += name

    if (isVariable) {
      attributeNames[name] = value.join('')
    } else {
      attributeValues[name] = { [type]: recast(type, value.join('')) }
    }
  }

  expression += source

  return { attributeValues, attributeNames, expression }
}

module.exports = {
  queryParser,
  getDataType,
  getDynamoDataType,
  toJSON,
  toDynamoJSON
}
