# Copilot Instructions — az-functions Monorepo

These are repository-wide instructions for AI coding assistants (GitHub Copilot, JetBrains AI, etc.) working
in this repository. Read this file before making changes. This file is the source of truth for repository
conventions.

> **Note on `docs/way-of-working.md`:** The `docs/` folder is an early, unfinished **draft** and is **not**
> authoritative. Do not rely on it, do not link to it as guidance, and do not treat it as reflecting current
> practice — prefer this file and the actual code/config in the repo instead. Treat any conflict between
> `docs/` and this file (or the real code) in favor of this file / the code.

## Purpose of the Monorepo

`@herrromich/az-functions-monorepo` develops and maintains a set of open-source **extensions for Node.js Azure
Functions**, together with a full **example application** that demonstrates how to use them in a realistic,
production-shaped setup. Concretely, this monorepo:

- Publishes reusable npm packages that add a decorator-based, IoC-driven, code-first programming model on top
  of the official `@azure/functions` v4 model (HTTP controllers, Event Hub handlers, OpenAPI generation,
  structured logging).
- Publishes a standalone declarative transaction-management library for Kysely.
- Ships a reference **backend** (Azure Functions app), **frontend** (Angular SPA), and a shared **security**
  library that together show end-to-end how the extensions are meant to be used (auth, persistence, REST APIs,
  Event Hub telemetry ingestion, OpenAPI-generated Angular API clients).
- Provisions the Azure infrastructure needed to run the examples via Terraform (`infra/`).

Everything lives together so that framework changes and their consumers (the examples) stay in sync and are
tested against each other in CI.

## Technologies Used

- **Package management / monorepo**: [pnpm workspaces](https://pnpm.io/workspaces) with a shared
  `catalog:` in `pnpm-workspace.yaml` for pinned dependency versions across all packages.
- **Language**: TypeScript (strict), compiled/bundled per package; Node.js `>=20`.
- **Backend / serverless**: `@azure/functions` v4 programming model, Azure Event Hubs, Azure Identity (Entra
  ID), Azure Static Web Apps.
- **Dependency Injection**: [InversifyJS](https://inversify.io/) (decorator-based IoC container).
- **Validation & schemas**: [Zod](https://zod.dev/), with `@asteasolutions/zod-to-openapi` for code-first
  OpenAPI generation.
- **Database**: [Kysely](https://kysely.dev/) (type-safe SQL query builder) over PostgreSQL (`pg`).
- **Logging & observability**: [Winston](https://github.com/winstonjs/winston) structured logging with
  optional OpenTelemetry / Application Insights export.
- **Frontend**: Angular (standalone, signals via `@ngrx/signals`), Angular Material, OpenLayers (`ol`),
  MSAL (`@azure/msal-angular`/`browser`) for auth, OpenAPI Generator CLI for typed API clients.
- **Testing**: Jest (`ts-jest`/Babel) with `jest-extended` and `jest-mock-extended`; coverage collected per
  package.
- **Build tooling**: Webpack (backend/library bundling), Angular CLI (`ng build`), TypeScript project builds
  (`tsc --build`) for lightweight packages.
- **Linting/formatting**: ESLint (flat config, shared bases in `eslint.base.config.mjs`), Prettier, `gts`.
- **Infrastructure as Code**: Terraform (`infra/`) for Azure resources (Functions, Static Web Apps, Event Hub,
  Redis cache, PostgreSQL, storage).
- **CI/CD**: pnpm recursive scripts (`ci:build`, `dist:build`, `dist:assemble`) orchestrate lint → test →
  build → package → deploy across the workspace.

## Repository Structure

```
packages/
  extensions/           # Published, reusable libraries (the "framework")
    az-functions/        # Core Azure Functions extension framework
    transaction-manager/ # Standalone declarative transaction management for Kysely
  examples/              # Reference application consuming the extensions
    backend/              # Example Azure Functions app (HTTP + Event Hub)
    frontend/             # Example Angular SPA
    security/             # Shared auth/security utilities used by backend & frontend
  forks/
    source-map-support/  # Vendored/patched fork of `source-map-support`
  utilities/
    test-utilities/      # Shared test helpers used across packages
infra/                  # Terraform infrastructure for the example deployment
docs/                   # Draft notes only — not authoritative, do not use as guidance (see note above)
```

Common per-package scripts (via pnpm): `lint`, `test`, `dist:build`, `dist:clean`, `watch`, `ci:build`. Prefer
running these from the affected package (`pnpm --filter <name> run <script>`) rather than the root, unless a
change is workspace-wide.

## Package-Specific Guidance

### `packages/extensions/az-functions` — `@herrromich/az-functions`

Core published library. Extends the Azure Functions v4 Node.js programming model with:

- Decorator-based **HTTP controllers** (`@HttpController`, `@Get/@Post/@Put/@Patch/@Delete/@Head`, parameter
  decorators like `@Body`, `@QueryParam`, `@PathParam`, `@HeaderParam`, `@AuthCtx`) and **Event Hub handlers**
  (`@EventHubHandler`, `@OnEventHubTrigger`, `@Message(s)`/`@RawMessage(s)`).
- An Inversify-based IoC container bootstrapped via `startPlatform(...)`.
- Zod-driven request/message validation and **code-first OpenAPI** generation (`RestApplication`,
  `PLATFORM_MODE=print-open-api`).
- Structured logging (`LOGGER_FACTORY`, `Logger`, `LogLevelProvider`, `TrieSearchService`) with log
  sanitization and optional OpenTelemetry/Application Insights export.
- HTTP error classes (`BadRequestError`, `UnauthorizedError`, `NotFoundError`, `InternalServerError`) and
  `HttpDirectResponseBuilder` for fine-grained responses.

Conventions when editing this package:
- Requires `experimentalDecorators` + `emitDecoratorMetadata`; `reflect-metadata` must be imported first at
  the entry point (`src/init.ts`).
- Keep the public surface exported from `src/index.ts` in sync with the README (`README.md` documents the
  full public API — update both together).
- Internal/system loggers must use the `#az-functions` (`SYSTEM_LOGGER_NAME_PREFIX`) naming convention.
- Build: webpack (production bundle to `dist/`) + `tsc-alias` for `.d.ts` path fixing. Test: Jest,
  `--env=node`, with coverage. `@azure/functions`, `inversify`, `reflect-metadata`, `zod`,
  `@asteasolutions/zod-to-openapi` are **peer dependencies**, not regular dependencies.

### `packages/extensions/transaction-manager` — `@herrromich/transaction-manager`

Published library providing Spring-style declarative transaction management for **Kysely**:

- `@Transactional(config?)` decorator, usable on classes and/or methods (method-level overrides class-level).
- Propagation strategies: `required`, `requires_new`, `mandatory`, `never`, `supports`, `not_supported`,
  `nested` (savepoints).
- Isolation levels: `default`, `read_commited`, `read_uncommited`, `repeatable_read`, `serializable`.
- `registerDataSource(kyselyProvider, name?)` returns a `DataSource<DB>` proxy that transparently routes
  queries to the active `AsyncLocalStorage`-scoped transaction, or falls back to the root Kysely instance.
- Designed to integrate with Inversify (`bind(AppDataSource).toDynamicValue(...)`) but has no hard dependency
  on it.

Conventions: `kysely` is a **peer dependency**. Keep behavior changes covered by the corresponding
`*.test.ts` files (decorators, storage, wrapper/transactional methods) and reflected in `README.md`.

### `packages/examples/backend` — `example-backend`

Reference Azure Functions app (private, not published) that consumes `@herrromich/az-functions`,
`@herrromich/transaction-manager`, `@utilities/test-utilities`, `@forks/source-map-support`, and
`example-security`. Demonstrates: HTTP controllers + Event Hub handlers, Inversify container modules,
PostgreSQL access via Kysely (`pg`, `wkx`/`zod-geojson` for geo data), Redis (`@redis/client`,
`@redis/entraid`), JWT-based auth (`jsonwebtoken`, `jwks-rsa`), and OpenAPI generation consumed by the
frontend's generated API client. Run locally with `func start` (Azure Functions Core Tools) or via
`swa` alongside the frontend. `dist:assemble` packages the deployable artifact (see `scripts/assemble.mjs`).

### `packages/examples/frontend` — `example-frontend`

Reference Angular SPA (private) built with Angular CLI, Angular Material, `@ngrx/signals`, OpenLayers maps,
and MSAL for Entra ID auth. Consumes `example-security` and a **generated** OpenAPI client
(`api:generate:console`, via `@openapitools/openapi-generator-cli`) built from the backend's OpenAPI JSON —
regenerate the client after changing backend controller contracts rather than hand-editing generated files.
Served/proxied together with the backend via Azure Static Web Apps CLI (`swa`).

### `packages/examples/security` — `example-security`

Small, private, shared library consumed by **both** `example-backend` and `example-frontend`. Holds
authentication/security models and utilities that must stay consistent between frontend and backend (e.g.
token/claims shapes). Depends only on `@herrromich/az-functions`. Changes here typically require checking
both consumers for breakage.

### `packages/forks/source-map-support` — `@forks/source-map-support`

Private, vendored fork of the [`source-map-support`](https://www.npmjs.com/package/source-map-support)
package, kept in-repo to allow local patches. Prefer minimal, well-documented diffs against upstream; note any
divergence from the original package in comments so future upgrades are easier to reconcile.

### `packages/utilities/test-utilities` — `@utilities/test-utilities`

Private, shared **test-only** helpers used across the other packages' Jest suites. Has `@jest/globals`,
`jest`, and `expect` as peer dependencies (never bundle these as regular dependencies). Built with plain
`tsc --build` (no webpack) since it only needs to ship type-checked JS + `.d.ts` files for other workspace
packages to consume via `workspace:*`.

### `infra/` — Terraform infrastructure

Provisions the Azure resources backing the examples: Functions/console app hosting, PostgreSQL database,
Event Hub, Redis cache, storage, and shared "persistence" resources, split into subfolders
(`cache/`, `console_app/`, `database/`, `eventhub/`, `persistence/`, `storage/`) each with their own
`main.tf`/`variables.tf`. Root `main.tf` wires modules together; `infra.tfvars` holds environment values.
Deploy via `pnpm run infra:deploy` (root script) — avoid editing `terraform.tfstate*` by hand.

## General Conventions

- Use `workspace:*` for cross-package dependencies within this monorepo, and `catalog:` for shared
  third-party dependency versions — don't hardcode versions that already exist in the `catalog:` of
  `pnpm-workspace.yaml`.
- Each package exposes consistent script names (`lint`, `test`, `dist:build`, `watch`, `ci:build`); when
  adding a new package, mirror these names so root-level recursive scripts keep working.
- Libraries intended for npm publishing (`az-functions`, `transaction-manager`) must keep their `README.md`
  accurate — it is the primary public documentation — and treat `peerDependencies` correctly (don't move a
  peer dependency into `dependencies` without good reason).
  - Prefer adding/adjusting Jest tests alongside code changes; most source files have a co-located
  `*.test.ts`.
- Do not consult or cite `docs/way-of-working.md` (or its sub-pages) for guidance — it is an unfinished
  draft and excluded from consideration. This file is the current source of truth for conventions; infer
  anything not covered here from the actual code, configs, and package READMEs.




