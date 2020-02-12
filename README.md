# USAGE

const Dynabvolt = require('dynavolt')
const db = new Datavolt('tablename', { region: 'us-west-2' })


### PUT

```js
const { err } = await db.put('foo', 'bar', { beep: 'boop', quxx: 42 })
```

### GET

```js
const { err, data } = await db.get('foo', 'bar')
```

### QUERY

```js
const iterator = table.query('foo', 'b')

for await (const { key, value } of iterator) {
  console.log(key, value)
}
```

### SCAN

```js
const iterator = table.scan('foo', 'bar')

for await (const { key, value } of iterator) {
  console.log(key, value)
}
```
