# SYNOPSIS
An easy to use dynamodb client.

# USAGE

```js
const Dynabvolt = require('dynavolt')
const db = new Datavolt('tablename', { region: 'us-west-2' })
```

### PUT

```js
const { err } = await db.put('foo', 'bar', { beep: 'boop', quxx: 42 })
```

### GET

```js
const { err, data } = await db.get('foo', 'bar')
```

### QUERY
Query takes a [Key Condition Expression][0]. For syntax refernece see the
[Comparison Operator and Function Reference][1].

```js
const iterator = db.query(`hash = N(greetings) AND begins_with(range, S(hell))`)

for await (const { key, value } of iterator) {
  console.log(key, value)
}
```

You can also chain a [Filter Expression][2] and [Projection Expression][3]
clauses onto querties. More info about Projection Expression syntax [here][4].

```js
const iterator = db
  .query(`hash = N(songs) AND begins_with(range, S(moth))`)
  .filter(`contains(artists.name, S(danzig)`)
  .properties('artists.weight', 'artists.height')

for await (const { key, value } of iterator) {
  console.log(key, value)
}
```

### SCAN
Scan takes a [Filter Expression][2].

```js
const iterator = db.scan(`contains(artists.name, S(danzig)`)

for await (const { key, value } of iterator) {
  console.log(key, value)
}
```



[0]:https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.html#Query.KeyConditionExpressions
[1]:https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.OperatorsAndFunctions.html
[2]:https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Scan.html#Scan.FilterExpression
[3]:https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ProjectionExpressions.html
[4]:https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.Attributes.html
