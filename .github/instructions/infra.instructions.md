---
applyTo: "infra/**"
---

# `infra/` — Terraform infrastructure

Provisions the Azure resources backing the examples: Functions/console app hosting, PostgreSQL database,
Event Hub, Redis cache, storage, and shared "persistence" resources, split into subfolders
(`cache/`, `console_app/`, `database/`, `eventhub/`, `persistence/`, `storage/`) each with their own
`main.tf`/`variables.tf`. Root `main.tf` wires modules together; `infra.tfvars` holds environment values.
Deploy via `pnpm run infra:deploy` (root script) — avoid editing `terraform.tfstate*` by hand.

