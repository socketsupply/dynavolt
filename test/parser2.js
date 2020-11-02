
function queryParser (source) {
  source = source.slice().trim()

  let variableIndex = 0
  const ExpressionAttributeValues = {}
  const ExpressionAttributeNames = {}

  if (!source.length) {
    return {
      Expression: source,
      ExpressionAttributeNames,
      ExpressionAttributeValues
    }
  }

  //
  // Identify strings first, since they can include subsequences
  // that we don't want to discover with this parser.
  //
  source = source.replace(/'([^']*)'/g, (_, v) => {
    variableIndex++
    const id = `:V${variableIndex}`
    ExpressionAttributeValues[id] = { S: v }
    return id
  })

  //
  // Digit literals will always be r-value operands in an expression
  // ie, = N, > N, + N, - N, < N (includes <>).
  //
  source = source.replace(/([=><+-]|BETWEEN|AND)\s+(\d+)/g, (_, op, v) => {
    variableIndex++
    const id = `:V${variableIndex}`
    ExpressionAttributeValues[id] = { N: parseFloat(v) }
    return `${op} ${id} `
  })

  source = source.replace(/([=><+-])\s+(null|true|false)/g, (_, op, v) => {
    variableIndex++
    v = v.toLowerCase()
    const type = v === 'null' ? 'NULL' : 'BOOL'
    const value = v === 'null' ? true : v === 'true'
    const id = `:V${variableIndex}`
    ExpressionAttributeValues[id] = { [type]: value }
    return `${op} ${id} `
  })

  //
  // Exume function paths
  //
  source = source.replace(/(\w+)\((\S+)([,)])/g, (_, fname, p1, ch) => {
    variableIndex++
    const v1 = `#V${variableIndex}`
    ExpressionAttributeNames[v1] = p1.trim()

    return `${fname}(${v1}${ch}`
  })

  //
  // all other paths will always be l-values and be suffixed by a comparator
  //
  source = source.replace(/([^:#(]\w+\S+)\s+([=><+-])/g, (_, v, op) => {
    variableIndex++
    const id = `#V${variableIndex}`
    ExpressionAttributeNames[id] = v.trim()
    return ` ${id} ${op} `
  })

  //
  // Binary values are almost the same as digits, but the character
  // string is anything that does't start with :, #, and isnt whitespace.
  //
  source = source.replace(/([=><+-])\s+([^:# ]+)/g, (_, op, v) => {
    variableIndex++
    const id = `:V${variableIndex}`
    ExpressionAttributeValues[id] = { B: v }
    return `${op} ${id} `
  })

  // Tidy
  source = source.replace(/ {2}/g, ' ')
  source = source.replace(/ ,/g, ',')
  source = source.replace(/\( /g, '(')

  return {
    ExpressionAttributeValues,
    ExpressionAttributeNames,
    Expression: source.trim()
  }
}

function test () {
  console.log(queryParser(''))
  console.log(queryParser('beep'))
  console.log(queryParser('beep > 10 AND (boop = \'barf\') '))
  console.log(queryParser('beep > 10 AND boop = \'barf\' '))
  console.log(queryParser('foo = SGVsbG8sIFdvcmxkLgo='))
  console.log(queryParser('SET count = count + 200, foo = 10'))
  console.log(queryParser('foo = bar'))
  console.log(queryParser('foo = \'bar\'   '))
  console.log(queryParser('foo = 1'))
  console.log(queryParser('foo = true'))
  console.log(queryParser('foo = false'))
  console.log(queryParser('foo = null'))
  console.log(queryParser('contains(beep.boop[1], \'bar\')'))
  console.log(queryParser('size(foo.bar) AND contains(quxx.bar, 100)'))
  console.log(queryParser('foo AND (bar > \'10\')'))
  console.log(queryParser('foo BETWEEN 10 AND 20'))

  console.log(queryParser('DELETE burp'))

  /*
  console.log(queryParser('foo IN (10 20 30)'))
  console.log(queryParser('foo IN (\'foo\' \'bar\' \'bazz\')'))
  console.log(queryParser('foo IN (beep boop burp)'))
  */
}

test()
