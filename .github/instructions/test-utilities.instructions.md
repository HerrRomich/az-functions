---
applyTo: "packages/utilities/test-utilities/**"
---

# `@utilities/test-utilities`

Private, shared **test-only** helpers used across the other packages' Jest suites. Has `@jest/globals`,
`jest`, and `expect` as peer dependencies (never bundle these as regular dependencies). Built with plain
`tsc --build` (no webpack) since it only needs to ship type-checked JS + `.d.ts` files for other workspace
packages to consume via `workspace:*`.

