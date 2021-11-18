import 'aws-sdk'

/**
 * Result containers for async (default) and sync results for
 * `Either<T><{ err: Error }|{ data: T }>` values.
 */
export type ResultSync<T, E = Error> = { err?: E, data?: T };
export type Result<T, E = Error> = Promise<ResultSync<T, E>>;

/**
 * Various primitive types used in dynavolt
 */
export namespace Types {
  /**
   * A simple JSON type.
   */
  export type JSON =
    null|number|string|boolean|Array<JSON>|{[key: string]: JSON};

  /**
   * A scalar type for a `hash`.
   */
  export type Hash = string;

  /**
   * A scalar type for a `range`.
   */
  export type Range = string;

  /**
   * A scalar type for a DSL `query`.
   */
  export type Query = string;

  /**
   * A scalar type for an iterator method type.
   */
  export type IteratorMethod = 'scan'|'query';
}

/**
 * Constructors as types used in Dynavolt.
 */
export namespace Constructors {
  /**
   * Provides typing for `new AWS.DynamoDB(...)`
   */
  export type DynamoDB = new (
    opts?: AWS.DynamoDB.Types.ClientConfiguration
  ) => AWS.DynamoDB;

  /**
   * Provides typing for `new dynavolt.Table(...)`
   */
  export type Table = new (
    DynamoDB: Constructors.DynamoDB,
    dbOpts?: DatabaseOptions,
    opts?: TableOptions
  ) => Table;
}

/**
 * A union option for the `DynamoDB` class constructor given to the `Database`
 * class constructor.
 */
export type DatabaseDynamoDBOption = Constructors.DynamoDB | {
  DynamoDB: Constructors.DynamoDB
}

/**
 * Options that extend `AWS.DynamoDB.Types.ClientConfiguration` for a `Database`
 * class instance typically used in the constructor.
 */
export type DatabaseOptions = AWS.DynamoDB.Types.ClientConfiguration & {
  onDemand?: boolean;
}

/**
 * A mapping of names to `Table` class instances that have been opened.
 */
export type OpenedDatabaseTables = {
  [key: string]: dynavolt.ITable
}

/**
 * Options that extend `DatabaseOptions` for a `Table` class instance
 * typically used in the constructor.
 */
export type TableOptions = DatabaseOptions & {
  disableATD?: boolean;
}

/**
 * Options that extend `TableOptions` used to open and return a table
 * from a `Database` instance with `open()`.
 */
export type OpenTableOptions = TableOptions & {
  create?: boolean;
}

/**
 * Options that extend `AWS.DynamoDB.CreateTableInput` used to create a table
 * from a `Database` instance with `create()`.
 */
export type CreateTableOptions = Omit<AWS.DynamoDB.CreateTableInput,
  // These options are omitted from `CreateTableInput` as
  // the `create()` function will define them in the request params
  'TableName'|'KeySchema'|'AttributeDefinitions'
> & {
  readCapacity?: number;
  writeCapacity?: number;
}

/**
 * Key properties for a given `hash` and `range` based on a table's
 * `rangeType`, `rangeKey`, `hashType`, and `hashKey`.
 */
export type TableKeyProperties = {
  [key: string]: { [key: string]: string }
}

/**
 * Input typing for `batchWrite()` on a `Table` class instance.
 */
export type TableBatchWriteInput = Array<[Types.Hash, Types.Range, JSON]>;

/**
 * Options for `batchWrite()` that extends
 * `AWS.DynamoDB.BatchWriteItemRequestMap`.
 */
export type TableBatchWriteOptions = AWS.DynamoDB.BatchWriteItemRequestMap & {}

/**
 * Input typing for `batchRead()` on a `Table` class instance.
 */
export type TableBatchReadInput = Array<[Types.Hash, Types.Range]>;

/**
 * Options for `batchRead()` on a `Table` class instance that extends
 * `AWS.DynamoDB.Types.BatchGetItemInput`.
 */
export type TableBatchReadOptions = Omit<AWS.DynamoDB.Types.BatchGetItemInput,
  'RequestItems'
> & {}

/**
 * Options for `update()` on a `Table` class instance that extends
 * `AWS.DynamoDB.UpdateItemInput`.
 */
export type TableUpdateOptions = Omit<AWS.DynamoDB.UpdateItemInput,
  'TableName'|'Key'
> & {}

/**
 * Options for `count()` on a `Table` class instance that extends
 * `AWS.DynamoDB.DescribeTableInput`.
 */
export type TableCountOptions = Omit<AWS.DynamoDB.DescribeTableInput,
  'TableName'
> & {}

/**
 * A special result type for  `count()` return value on a `Table`
 * class instance that includes the last evaluated key in the count.
 */
export type TableCountResult<E = Error> = Promise<{
  err?: E,
  data?: number,
  LastEvaluatedKey?: AWS.DynamoDB.Key
}>;

/**
 * Options for `get()` on a `Table` class instance that extends
 * `AWS.DynamoDB.Types.GetItemInput`.
 */
export type TableGetOptions = Omit<AWS.DynamoDB.Types.GetItemInput,
  'Key'|'TableName'
> & {}

/**
 * Input for `put()` on a `Table` class instance.
 */
export type TablePutInput = {
}

/**
 * Options for `put()` on a `Table` class instance that extends
 * `AWS.DynamoDB.Types.PutItemInput`.
 */
export type TablePutOptions = Omit<AWS.DynamoDB.Types.PutItemInput,
  'Item'|'TableName'
> & {}

export type TableIteratorOptions = Omit<
  AWS.DynamoDB.QueryInput & AWS.DynamoDB.ScanInput,
  'ExpressionAttributeValues'|'ExpressionAttributeNames'|'TableName'
> & {}

/**
 * An interface for the iterator used by `Table`.
 */
export interface ITableIterator<T = any> {
  next(): Promise<{ value: { key: string[], value: T } } | { value: null, done: true }>;
  properties(dsl: string): Promise<void>;
  filter(dsl: string): Promise<void>;
  [Symbol.asyncIterator]: () => AsyncIterator<ResultSync<T>>;
}

/**
 * An interface for a `Table` class instance.
 */
export interface ITable {
  disableATD: boolean;
  meta: AWS.DynamoDB.Types.TableDescription | null;
  db: AWS.DynamoDB;

  hashType: string | null;
  hashKey: string | null;

  rangeType: string | null;
  rangeKey: string | null;

  count (
    isManualCount: boolean,
    opts?: TableCountOptions
  ): TableCountResult;

  delete (
    hash: Types.Hash,
    range: Types.Range
  ): Result<void>;

  get (
    hash: Types.Hash,
    range: Types.Range,
    opts?: TableGetOptions
  ): Result<any>;

  put (
    hash: Types.Hash,
    range: Types.Range,
    props: TablePutInput,
    opts?: TablePutOptions
  ): Result<void>;

  putNew (
    hash: Types.Hash,
    range: Types.Range,
    props: TablePutInput,
    opts?: TablePutOptions
  ): Result<void>;

  update (
    hash: Types.Hash,
    range: Types.Range,
    dsl: Types.Query,
    opts?: TableUpdateOptions
  ): Result<AWS.DynamoDB.AttributeMap>;

  scan (
    dsl: Types.Query,
    opts?: TableIteratorOptions
  ): ITableIterator;

  query (
    dsl: Types.Query,
    opts?: TableIteratorOptions
  ): ITableIterator;

  iterator (
    dsl: Types.Query,
    opts: TableIteratorOptions,
    method: Types.IteratorMethod
  ): ITableIterator;

  batchRead (
    batch: TableBatchReadInput,
    opts?: TableBatchReadOptions
  ): Result<object>;

  batchWrite (
    batch: TableBatchWriteInput,
    opts?: TableBatchWriteOptions
  ): Result<void>;

  setTTL (
    attributeName?: string,
    enabled?: boolean
  ): Result<ITable>;

  createKeyProperties (
    hash: Types.Hash,
    range: Types.Range
  ): TableKeyProperties;
}

/**
 * An interface for a `Database` class instance.
 */
export interface IDatabase {
  db: AWS.DynamoDB;
  opts: DatabaseOptions;
  tables: OpenTableOptions;
  DynamoDB: Constructors.DynamoDB;

  open (
    tableName: string,
    opts?: OpenTableOptions
  ): Result<ITable>;

  create (
    tableName: string,
    hash?: Types.Hash,
    range?: Types.Range,
    opts?: CreateTableOptions
  ): Result<IDatabase>;
}

/**
 * An interface for a `Database` class instance that contains the constructor
 * function signature for the `new` operator.
 */
export class Database implements IDatabase {
  db: AWS.DynamoDB;
  opts: DatabaseOptions;
  tables: OpenTableOptions;
  DynamoDB: Constructors.DynamoDB;

  constructor (
    DynamoDB: Constructors.DynamoDB,
    opts: DatabaseOptions
  );

  open (
    tableName: string,
    opts?: OpenTableOptions
  ): Result<ITable>;

  create (
    tableName: string,
    hash?: Types.Hash,
    range?: Types.Range,
    opts?: CreateTableOptions
  ): Result<IDatabase>;
}

/**
 * An interface for a `Table` class instance that contains the constructor
 * function signature for the `new` operator.
 */
export class Table implements ITable {
  disableATD: boolean;
  meta: AWS.DynamoDB.Types.TableDescription | null;
  db: AWS.DynamoDB;

  hashType: string | null;
  hashKey: string | null;

  rangeType: string | null;
  rangeKey: string | null;

  constructor (
    DynamoDB: Constructors.DynamoDB,
    dbOpts?: AWS.DynamoDB.Types.ClientConfiguration,
    opts?: TableOptions
  );

  count (
    isManualCount: boolean,
    opts?: TableCountOptions
  ): TableCountResult;

  delete (
    hash: Types.Hash,
    range: Types.Range
  ): Result<void>;

  get (
    hash: Types.Hash,
    range: Types.Range,
    opts?: TableGetOptions
  ): Result<any>;

  put (
    hash: Types.Hash,
    range: Types.Range,
    props: TablePutInput,
    opts?: TablePutOptions
  ): Result<void>;

  putNew (
    hash: Types.Hash,
    range: Types.Range,
    props: TablePutInput,
    opts?: TablePutOptions
  ): Result<void>;

  update (
    hash: Types.Hash,
    range: Types.Range,
    dsl: Types.Query,
    opts?: TableUpdateOptions
  ): Result<AWS.DynamoDB.AttributeMap>;

  scan (
    dsl: Types.Query,
    opts?: TableIteratorOptions
  ): ITableIterator;

  query (
    dsl: Types.Query,
    opts?: TableIteratorOptions
  ): ITableIterator;

  iterator (
    dsl: Types.Query,
    opts: TableIteratorOptions,
    method: Types.IteratorMethod
  ): ITableIterator;

  batchRead (
    batch: TableBatchReadInput,
    opts?: TableBatchReadOptions
  ): Result<object>;

  batchWrite (
    batch: TableBatchWriteInput,
    opts?: TableBatchWriteOptions
  ): Result<void>;

  setTTL (
    attributeName?: string,
    enabled?: boolean
  ): Result<ITable>;

  createKeyProperties (
    hash: Types.Hash,
    range: Types.Range
  ): TableKeyProperties;
}

declare module "@operatortc/dynavolt" {
  export = Database;
}

export as namespace dynavolt
