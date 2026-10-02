---
applyTo: "packages/extensions/az-functions/**"
---

# `@herrromich/az-functions`

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

## Conventions

- Requires `experimentalDecorators` + `emitDecoratorMetadata`; `reflect-metadata` must be imported first at
  the entry point (`src/init.ts`).
- Keep the public surface exported from `src/index.ts` in sync with the README (`README.md` documents the
  full public API — update both together).
- Internal/system loggers must use the `#az-functions` (`SYSTEM_LOGGER_NAME_PREFIX`) naming convention.
- Build: webpack (production bundle to `dist/`) + `tsc-alias` for `.d.ts` path fixing. Test: Jest,
  `--env=node`, with coverage. `@azure/functions`, `inversify`, `reflect-metadata`, `zod`,
  `@asteasolutions/zod-to-openapi` are **peer dependencies**, not regular dependencies.

