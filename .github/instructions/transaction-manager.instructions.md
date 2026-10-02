---
applyTo: "packages/extensions/transaction-manager/**"
---

# `@herrromich/transaction-manager`

Published library providing Spring-style declarative transaction management for **Kysely**:

- `@Transactional(config?)` decorator, usable on classes and/or methods (method-level overrides class-level).
- Propagation strategies: `required`, `requires_new`, `mandatory`, `never`, `supports`, `not_supported`,
  `nested` (savepoints).
- Isolation levels: `default`, `read_commited`, `read_uncommited`, `repeatable_read`, `serializable`.
- `registerDataSource(kyselyProvider, name?)` returns a `DataSource<DB>` proxy that transparently routes
  queries to the active `AsyncLocalStorage`-scoped transaction, or falls back to the root Kysely instance.
- Designed to integrate with Inversify (`bind(AppDataSource).toDynamicValue(...)`) but has no hard dependency
  on it.

## Conventions

`kysely` is a **peer dependency**. Keep behavior changes covered by the corresponding `*.test.ts` files
(decorators, storage, wrapper/transactional methods) and reflected in `README.md`.

