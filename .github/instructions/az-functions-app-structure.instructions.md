---
applyTo: "packages/examples/backend/**"
---

# example-backend — Folder Structure

`example-backend` is the reference Azure Functions app demonstrating `@herrromich/az-functions` (private, not
published). It consumes `@herrromich/az-functions`, `@herrromich/transaction-manager`,
`@utilities/test-utilities`, `@forks/source-map-support`, and `example-security`. Demonstrates: HTTP
controllers + Event Hub handlers, Inversify container modules, PostgreSQL access via Kysely (`pg`,
`wkx`/`zod-geojson` for geo data), Redis (`@redis/client`, `@redis/entraid`), JWT-based auth
(`jsonwebtoken`, `jwks-rsa`), and OpenAPI generation consumed by the frontend's generated API client. Run
locally with `func start` (Azure Functions Core Tools) or via `swa` alongside the frontend. `dist:assemble`
packages the deployable artifact (see `scripts/assemble.mjs`).

Path aliases `@fleet-sight/interfaces/*` and `@fleet-sight/shared/*` map to `src/interfaces/*` and
`src/shared/*`.

```
src/
├── init.ts, index.ts        # composition root (startPlatform)
├── interfaces/               # framework-facing layer (controllers, handlers)
│   ├── rest/<feature>/        # HTTP controllers, DTOs, mappers, RestApplications
│   └── event-hub/<feature>/   # Event Hub handlers
└── shared/                   # domain/infrastructure layer
    ├── domain/<feature>/  # domain services & repositories
    └── <cross-cutting>/          
```


