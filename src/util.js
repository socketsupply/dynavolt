// @ts-check
'use strict'

const TYPE_RE = /\[object (\w+)\]/

/**
 * Returns the internal class as a string data type.
 * @param {any} v
 * @return {string?}
 */
function getDataType (v) {
  const match = Object.prototype.toString.call(v).match(TYPE_RE)
  return match ? match[1] : null
}

/**
 * Returns the "DynamoDB" data type as a string for a given value.
 * @param {any} v
 * @return {string}
 */
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

  return 'NULL'
}

/**
 * @param {string|object|boolean|number} original
 * @return {object}
 */
function toDynamoJSON (original) {
  const copy = JSON.parse(JSON.stringify(original))

  // @ts-ignore
  const convert = (copy, original) => {
    for (const [k, v] of Object.entries(copy)) {
      const type = getDataType(original[k])

      if (type === 'Object') {
        copy[k] = convert(v, original[k])
      }

      let value = copy[k]

      if (type === 'Array') {
        const typeOfFirstItem = getDataType(original[k][0])

        if (typeOfFirstItem && ['Object', 'Array'].includes(typeOfFirstItem)) {
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

/**
 * @param {object|string|boolean} o
 * @return {object}
 */
function toJSON (o) {
  // @ts-ignore
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

const RE_DIGITS = /([ (=><+-]|BETWEEN|AND)\s*(\d+(\.\d+)?)/gm
const RE_OTHER = /([ (=><+-])\s+(null|true|false)/gm
const RE_PAIRS = /(ADD|REMOVE|DELETE)\s+(\w+\S+)\s+/gm
const RE_BETWEEN = /([^() ]+)\s+BETWEEN\s+/gm
const RE_IN = /([^() ]+)\s+IN\s+/gm
const RE_FUNCTIONS = /(\w+)\((\S+)([,)])/gm
const RE_COMPARATOR = /((?:^)?[^\s()]+)\s+([=><+-]{1,2})/gm
const RE_BINARY = /(?:<([^ >]+)>)/gm
const RE_STRING = /'((?:[^'\\]|\\.)*)'/gm

/**
 * Parses source query string into an expression object.
 * @param {string} source
 * @return {{
 *   Expression: string,
 *   ExpressionAttributeNames: AWS.DynamoDB.ExpressionAttributeNameMap,
 *   ExpressionAttributeValues: AWS.DynamoDB.ExpressionAttributeValueMap
 * }}
 */
function queryParser (source) {
  source = source.slice().trim()

  let variableIndex = 0
  /** @type {AWS.DynamoDB.ExpressionAttributeValueMap} */
  const ExpressionAttributeValues = {}
  /** @type {AWS.DynamoDB.ExpressionAttributeNameMap} */
  const ExpressionAttributeNames = {}

  if (!source.length) {
    return {
      Expression: source,
      ExpressionAttributeNames,
      ExpressionAttributeValues
    }
  }

  //
  // Dynamo property nest spec is #s.#s..., a propery named 's.s'
  // could be supported if quoted.
  //
  /** @type {(s: string) => string} */
  const createPath = s => {
    if (/^[#:]/.test(s.trim())) {
      return s
    }

    return s.split('.').map((/** @type {string} */ str) => {
      const parts = str.split('[')
      variableIndex++
      const id = `#V${variableIndex}`
      ExpressionAttributeNames[id] = parts[0].trim().replace(/^`/, '').replace(/`$/, '')
      return id + (parts[1] ? '[' + parts[1] : '')
    }).join('.')
  }

  source = source.replace(/[`|"]([^`"]+)["|`]\s*([=<>!]+)/gm, (_, v, op) => {
    return `${createPath(v)} ${op || ''}`.trim()
  })

  //
  // Identify strings first, since they can include subsequences
  // that we don't want to discover with this pass.
  //
  source = source.replace(RE_STRING, (_, v) => {
    variableIndex++
    const id = `:V${variableIndex}`
    ExpressionAttributeValues[id] = { S: v }
    return id
  })

  //
  // Digit literals will always be r-value operands in an expression
  // ie, = N, > N, + N, - N, < N. except with ADD|REMOVE|DELETE.
  //
  source = source.replace(RE_DIGITS, (_, op, v) => {
    variableIndex++
    const id = `:V${variableIndex}`
    ExpressionAttributeValues[id] = { N: v }
    return `${op} ${id} `
  })

  //
  // In cases where the r-value is null, true or false.
  //
  source = source.replace(RE_OTHER, (_, op, v) => {
    variableIndex++
    v = v.toLowerCase()
    const type = v === 'null' ? 'NULL' : 'BOOL'
    const value = v === 'null' ? true : v === 'true'
    const id = `:V${variableIndex}`
    ExpressionAttributeValues[id] = { [type]: value }
    return `${op} ${id} `
  })

  source = source.replace(RE_PAIRS, (_, op, v) => {
    return `${op} ${createPath(v)} `
  })

  source = source.replace(RE_BETWEEN, (_, v) => {
    return ` ${createPath(v)} BETWEEN `
  })

  source = source.replace(RE_IN, (_, v) => {
    return ` ${createPath(v)} IN `
  })

  //
  // Binary values are almost the same as digits, but the character
  // string is anything that does't start with :, #, and isnt whitespace.
  //
  source = source.replace(RE_BINARY, (_, v) => {
    variableIndex++
    const id = `:V${variableIndex}`
    ExpressionAttributeValues[id] = { B: v }
    return ` ${id} `
  })

  //
  // Exume function paths
  //
  source = source.replace(RE_FUNCTIONS, (_, fname, v, ch) => {
    return ` ${fname}(${createPath(v)}${ch} `
  })

  //
  // paths can be l-values and be suffixed by a comparator
  //
  source = source.replace(RE_COMPARATOR, (_, v, op) => {
    return ` ${createPath(v)} ${op} `
  })

  // Tidy
  source = source.replace(/\s{2,}/g, ' ')
  source = source.replace(/\s*,/g, ',')
  source = source.replace(/\(\s*/g, '(')
  source = source.replace(/\s*\)/g, ')')

  return {
    ExpressionAttributeValues,
    ExpressionAttributeNames,
    Expression: source.trim()
  }
}

export {
  queryParser,
  getDataType,
  getDynamoDataType,
  toJSON,
  toDynamoJSON
}
