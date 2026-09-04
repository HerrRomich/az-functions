---
applyTo: "packages/examples/backend/**"
---

# example-backend — Folder Structure

`example-backend` is the reference Azure Functions app demonstrating `@herrromich/az-functions`. Path
aliases `@fleet-sight/interfaces/*` and `@fleet-sight/shared/*` map to `src/interfaces/*` and `src/shared/*`.

```
src/
├── init.ts, index.ts        # composition root (startPlatform)
├── interfaces/               # framework-facing layer (controllers, handlers)
│   ├── rest/<feature>/        # HTTP controllers, DTOs, mappers, RestApplications
│   └── event-hub/<feature>/   # Event Hub handlers
└── shared/                   # domain/infrastructure layer
    ├── application/<feature>/  # domain services & repositories
    └── <cross-cutting>/          
```


