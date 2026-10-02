---
applyTo: "packages/examples/security/**"
---

# `example-security`

Small, private, shared library consumed by **both** `example-backend` and `example-frontend`. Holds
authentication/security models and utilities that must stay consistent between frontend and backend (e.g.
token/claims shapes). Depends only on `@herrromich/az-functions`. Changes here typically require checking
both consumers for breakage.

