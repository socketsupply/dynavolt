# SYNOPSIS
A nice DynamoDB client.

# USAGE

```js
const AWS = require('aws-sdk')
const Dynavolt = require('dynavolt')
const db = new Dynavolt(AWS, { region: 'us-west-2' })
```

## TABLES

### CREATE

```js
const { err, data: table } = await db.create('artists')
```

<details><summary><i>ADVANCED USAGE</i></summary>
<p>

You can also specify `hash`, `range`, and `options`.

```js
const opts = { TimeToLiveSpecification: {
  AttributeName: 'ttl',
  Enabled: true
}

const { err } = await db.create('artists', 'genres', 'artists', opts)
```

</p>
</details>

### OPEN
Open a database and optionally create it if it doesnt exist.

```js
const { err, data: table } = await db.open('artists', { create: true })
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
  ['foo', 'bar', { beep: 'boop' }],
  ['foo', 'bar']
])
```

### BATCH READ

```js
const { err } = await table.batchRead([
  ['foo', 'bazz'],
  ['beep', 'boop']
])
```

### QUERY
Query takes a [Key Condition Expression][0]. For syntax refernece see the
[Comparison Operator and Function Reference][1].

```js
const iterator = table.query(`hash = N(greetings) AND begins_with(range, S(hell))`)

for await (const { err, data: { key, value } } of iterator) {
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

for await (const { err, data: { key, value } } of iterator) {
  console.log(key, value)
}
```

</p>
</details>

### SCAN
Scan takes a [Filter Expression][2].

```js
const iterator = table.scan(`contains(artists.name, S(danzig)`)

for await (const { err, data: { key, value } } of iterator) {
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
