# @herrromich/transaction-manager

[![npm version](https://img.shields.io/npm/v/@herrromich/transaction-manager.svg)](https://www.npmjs.com/package/@herrromich/transaction-manager)
[![npm downloads](https://img.shields.io/npm/dm/@herrromich/transaction-manager.svg)](https://www.npmjs.com/package/@herrromich/transaction-manager)
[![license](https://img.shields.io/npm/l/@herrromich/transaction-manager.svg)](https://github.com/herrromich/az-functions/blob/main/packages/extensions/transaction-manager/LICENSE)
[![node](https://img.shields.io/node/v/@herrromich/transaction-manager.svg)](https://www.npmjs.com/package/@herrromich/transaction-manager)

A declarative transaction management extension for [Kysely](https://kysely.dev/) that provides Spring-style `@Transactional` decorator support with configurable propagation and isolation levels.

## Features

- **Decorator-based** — Use `@Transactional()` on classes and methods to declaratively manage transactions.
- **Transaction propagation** — Supports `required`, `requires_new`, `mandatory`, `never`, `supports`, `not_supported`, and `nested` propagation strategies.
- **Isolation levels** — Configure `read_commited`, `read_uncommited`, `repeatable_read`, or `serializable` isolation per method.
- **Multiple data sources** — Register and manage multiple Kysely instances under named data sources.
- **AsyncLocalStorage-based** — Transaction context is propagated through the async call stack using Node.js `AsyncLocalStorage`.
- **Savepoints** — Nested propagation leverages database savepoints for partial rollback support.

## Requirements

- Node.js >= 20
- `kysely` (peer dependency)
- `reflect-metadata` (for decorator metadata)

## Installation

```bash
pnpm add @herrromich/transaction-manager kysely reflect-metadata
```

```bash
npm install @herrromich/transaction-manager kysely reflect-metadata
```

```bash
yarn add @herrromich/transaction-manager kysely reflect-metadata
```

Ensure `reflect-metadata` is imported at the top of your application entry point:

```typescript
import 'reflect-metadata';
```

Enable experimental decorators and emit decorator metadata in your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

## Quick Start

### 1. Register a Data Source

Use `registerDataSource` to register a Kysely instance. The returned `DataSource` object is a proxy that automatically routes queries to the active transaction (if any) or to the root Kysely instance.

```typescript
import { registerDataSource, DataSource } from '@herrromich/transaction-manager';
import { Kysely, MssqlDialect } from 'kysely';

interface Database {
  users: { id: number; name: string; email: string };
  orders: { id: number; user_id: number; total: number };
}

const db: DataSource<Database> = registerDataSource(() => {
  return new Kysely<Database>({
    dialect: new MssqlDialect({ /* ... */ }),
  });
});

export { db };
```

### 2. Apply `@Transactional()` to Service Methods

Decorate methods that should execute within a transaction:

```typescript
import { Transactional } from '@herrromich/transaction-manager';
import { db } from './database';

class OrderService {
  @Transactional()
  async createOrder(userId: number, total: number): Promise<void> {
    await db
      .insertInto('orders')
      .values({ user_id: userId, total })
      .execute();
  }
}
```

### 3. Apply `@Transactional()` at Class Level

Class-level configuration provides defaults for all methods in the class. Method-level configuration overrides class-level settings:

```typescript
@Transactional({ name: 'my-data-source', propagation: 'requires_new' })
class PaymentService {
  @Transactional() // inherits name='my-data-source' and propagation='requires_new'
  async processPayment(orderId: number): Promise<void> {
    // ...
  }

  @Transactional({ propagation: 'mandatory' }) // overrides propagation only
  async validatePayment(orderId: number): Promise<void> {
    // ...
  }
}
```

## API Reference

### `registerDataSource<DB>(kyselyProvider, dataSourceName?)`

Registers a Kysely instance as a managed data source and returns a `DataSource<DB>` proxy.

| Parameter | Type | Description |
|---|---|---|
| `kyselyProvider` | `() => Kysely<DB>` | Factory function that creates the Kysely instance. |
| `dataSourceName` | `string \| symbol` | Optional name for the data source. Defaults to a built-in symbol. |

**Returns:** `DataSource<DB>` — A proxy to Kysely that transparently uses the active transaction when available.

**Throws:** `TransactionManagerError` if a data source with the same name is already registered.

### `@Transactional(config?)`

A decorator applicable to both classes and methods.

#### `TransactionalConfig`

| Property | Type | Default | Description |
|---|---|---|---|
| `name` | `string \| symbol` | Default data source | Identifies which registered data source to use. |
| `propagation` | `Propagation` | `'required'` | Transaction propagation strategy. |
| `isolation` | `Isolation` | `'default'` | Transaction isolation level. |

### `DataSource<DB>`

A class extending `Kysely<DB>`. Instances returned by `registerDataSource` are proxies that delegate all Kysely method calls and property accesses to the currently active transaction or the root Kysely instance.

### `TransactionManagerError`

Custom error class thrown when:
- A data source is registered with a duplicate name.
- A transactional method is invoked without a properly initialized transaction manager.
- Propagation constraints are violated (e.g., `mandatory` without an active transaction, `never` with an active transaction).

## Transaction Propagation Strategies

| Propagation | Behavior |
|---|---|
| `required` | Joins an existing transaction; creates a new one if none exists. **(default)** |
| `requires_new` | Always creates a new transaction, suspending the current one. |
| `mandatory` | Requires an existing transaction; throws `TransactionManagerError` if none exists. |
| `never` | Must execute without a transaction; throws `TransactionManagerError` if one exists. |
| `supports` | Executes within a transaction if one exists; otherwise executes non-transactionally. |
| `not_supported` | Always executes non-transactionally; suspends the current transaction if one exists. |
| `nested` | Creates a savepoint within the current transaction; creates a new transaction if none exists. Supports partial rollback to the savepoint. |

## Isolation Levels

| Isolation | Mapped SQL Level |
|---|---|
| `default` | Uses the database default isolation level. |
| `read_commited` | `READ COMMITTED` |
| `read_uncommited` | `READ UNCOMMITTED` |
| `repeatable_read` | `REPEATABLE READ` |
| `serializable` | `SERIALIZABLE` |

## Multiple Data Sources

Register multiple data sources by providing distinct names:

```typescript
import { registerDataSource, DataSource } from '@herrromich/transaction-manager';
import { Kysely, MssqlDialect, PostgresDialect } from 'kysely';

const primaryDb: DataSource<PrimaryDB> = registerDataSource(
  () => new Kysely<PrimaryDB>({ dialect: new MssqlDialect({ /* ... */ }) }),
  'primary',
);

const analyticsDb: DataSource<AnalyticsDB> = registerDataSource(
  () => new Kysely<AnalyticsDB>({ dialect: new PostgresDialect({ /* ... */ }) }),
  'analytics',
);
```

Then reference the data source by name in the decorator:

```typescript
class ReportService {
  @Transactional({ name: 'analytics', propagation: 'requires_new' })
  async generateReport(): Promise<void> {
    await analyticsDb.selectFrom('events').selectAll().execute();
  }
}
```

## Integration with Inversify IoC Container

When using [Inversify](https://inversify.io/) for dependency injection, you can register data sources as container bindings and inject them into your services.

### 1. Create a Typed DataSource Subclass

Create a concrete subclass of `DataSource` for your database schema. This gives you a distinct injectable type:

```typescript
import { DataSource } from '@herrromich/transaction-manager';

interface Database {
  users: { id: string; name: string; email: string };
  orders: { id: string; user_id: string; total: number };
}

export class AppDataSource extends DataSource<Database> {}
```

### 2. Register in a Container Module

Use `toDynamicValue` to call `registerDataSource` inside the container, so the Kysely instance is created with full access to other container bindings (e.g., config, logging):

```typescript
import { ContainerModule } from 'inversify';
import { Kysely, PostgresDialect } from 'kysely';
import { registerDataSource } from '@herrromich/transaction-manager';
import { AppDataSource } from './datasource';
import { APP_CONFIG } from './app-config';

export const PersistenceModule = new ContainerModule(({ bind }) => {
  bind(AppDataSource).toDynamicValue(context => {
    const appConfig = context.get(APP_CONFIG);
    return registerDataSource(() => {
      return new Kysely<Database>({
        dialect: new PostgresDialect({
          pool: { connectionString: appConfig.connectionString },
        }),
      });
    });
  });
});
```

### 3. Inject into Services

Combine `@injectable()` with `@Transactional()` on your repository classes. Inject the typed `DataSource` via the constructor:

```typescript
import { injectable } from 'inversify';
import { Transactional } from '@herrromich/transaction-manager';
import { AppDataSource } from './datasource';

@injectable()
@Transactional()
export class UsersRepository {
  constructor(private readonly db: AppDataSource) {}

  @Transactional()
  async getUsers() {
    return this.db.selectFrom('users').selectAll().execute();
  }

  @Transactional({ propagation: 'requires_new' })
  async createUser(name: string, email: string) {
    await this.db
      .insertInto('users')
      .values({ id: crypto.randomUUID(), name, email })
      .execute();
  }
}
```

The class-level `@Transactional()` sets the default transaction config for all methods, while method-level decorators can override specific settings like `propagation`. The injected `AppDataSource` proxy automatically routes queries to the active transaction.

## How It Works

1. **Registration** — `registerDataSource` creates a Kysely instance and wraps it in a proxy. All method calls and property accesses on the proxy check for an active transaction in `AsyncLocalStorage` before delegating.

2. **Decorator interception** — When a `@Transactional()` method is called, the decorator resolves the transaction manager by name, then applies the propagation strategy.

3. **Transaction lifecycle** — For propagation strategies that create transactions (`required`, `requires_new`, `nested`), the framework uses Kysely's `startTransaction()` API with controlled transactions. The transaction reference is stored in `AsyncLocalStorage` so any downstream code using the `DataSource` proxy automatically participates.

4. **Commit / Rollback** — If the decorated method completes successfully, the transaction is committed. If an error is thrown, the transaction is rolled back. For `nested` propagation, savepoints are used for partial rollback.

## License

MIT

