# SYNOPSIS
A nice DynamoDB client.

# USAGE

```js
const Dynavolt = require('dynavolt')
```

## TABLES

### CREATE

```js
const { err, table } = awwait Dynavolt.create('artists')
```

<details><summary><i>ADVANCED USAGE</i></summary>
<p>

You can also specify `hash`, `range` and `options`.

```js
const key = { hash: 'genres', range: 'artists' }

const opts = { TimeToLiveSpecification: {
  AttributeName: 'ttl',
  Enabled: true
}

const { err, table } = awwait Dynavolt.create('artists', key, opts)
```

</p>
</details>

### OPEN

```js
const { err, table } = await Dynavolt.open('artists', { region: 'us-west-2' })
```

## METHODS

### PUT
Dynavolt will automatically (and recursively) deduce the types of your data and
annotate them correctly, so there is no need to write "dynamodb json".

```js
const { err } = await table.put('glen', 'danzig', { height: 'quite-short' })
```

### PUT IF NOT EXISTS
Dynavolt will automatically (and recursively) deduce the types of your data and
annotate them correctly, so there is no need to write "dynamodb json".

```js
const { err } = await table.put('glen', 'danzig', { height: 'quite-short' })
```

### GET

```js
const { err, data } = await table.get('iggy', 'pop')
```

### DELETE

```js
const { err } = await table.delete('henry', 'rollins')
```

### BATCH WRITE

```js
const { err } = await table.batchWrite([
  { put: { hash: 'foo', range: 'bar', ... } },
  { delete: { hash: 'foo', range: 'bar' } }
 ])
```

### BATCH READ

```js
const { err } = await table.batchRead([
  { hash: 'foo', range: 'bazz' },
  { hash: 'beep', range: 'boop' }
])
```

### QUERY
Query takes a [Key Condition Expression][0]. For syntax refernece see the
[Comparison Operator and Function Reference][1].

```js
const iterator = table.query(`hash = N(greetings) AND begins_with(range, S(hell))`)

for await (const { key, value } of iterator) {
  console.log(key, value)
}
```

<details><summary><i>ADVANCED USAGE</i></summary>
<p>

You can also chain a [Filter Expression][2] and [Projection Expression][3]
clauses onto querties. More info about Projection Expression syntax [here][4].

```js
const iterator = table
  .query(`hash = N(songs) AND begins_with(range, S(moth))`)
  .filter(`contains(artists.name, S(danzig)`)
  .properties('artists.weight', 'artists.height')

for await (const { key, value } of iterator) {
  console.log(key, value)
}
```

</p>
</details>

### SCAN
Scan takes a [Filter Expression][2].

```js
const iterator = table.scan(`contains(artists.name, S(danzig)`)

for await (const { key, value } of iterator) {
  console.log(key, value)
}
```

### TTL
Records in your database can be set to expire by specifying a `TTL` attribute
on your table.

```js
const { err } = await table.setTTL('stillCool')
```

Now one minute after adding the following record, it will be removed.

```js
const opts = {
  stillCool: 6e4
}

const { err } = await table.put('brian', 'setzer', { cool: true }, opts)
```

[0]:https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.html#Query.KeyConditionExpressions
[1]:https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.OperatorsAndFunctions.html
[2]:https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Scan.html#Scan.FilterExpression
[3]:https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ProjectionExpressions.html
[4]:https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.Attributes.html
