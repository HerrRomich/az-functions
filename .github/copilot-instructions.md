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

Package- and area-specific rules live in scoped files under `.github/instructions/` (each declares its
`applyTo` path pattern) and are loaded only when working on matching files:

| Area | Instruction file |
|------|------------------|
| `packages/extensions/az-functions` | `az-functions-extension.instructions.md` |
| `packages/extensions/transaction-manager` | `transaction-manager.instructions.md` |
| `packages/examples/backend` | `az-functions-app-*.instructions.md` |
| `packages/examples/frontend` | `example-frontend.instructions.md` |
| `packages/examples/security` | `example-security.instructions.md` |
| `packages/forks/source-map-support` | `source-map-support-fork.instructions.md` |
| `packages/utilities/test-utilities` | `test-utilities.instructions.md` |
| `infra/` | `infra.instructions.md` |
| Branches, commits, tags (all) | `git-naming-conventions.instructions.md` |

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




