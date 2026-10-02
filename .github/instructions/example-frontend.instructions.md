---
applyTo: "packages/examples/frontend/**"
---

# `example-frontend`

Reference Angular SPA (private) built with Angular CLI, Angular Material, `@ngrx/signals`, OpenLayers maps,
and MSAL for Entra ID auth. Consumes `example-security` and a **generated** OpenAPI client
(`api:generate:console`, via `@openapitools/openapi-generator-cli`) built from the backend's OpenAPI JSON —
regenerate the client after changing backend controller contracts rather than hand-editing generated files.
Served/proxied together with the backend via Azure Static Web Apps CLI (`swa`).

