# Project Structure & Monorepo Guidelines

- All Azure Function App projects should reside in a single monorepo, organized under `packages/`.
- Use [pnpm workspaces](https://pnpm.io/workspaces) for efficient dependency management and isolation.
- Shared utilities, extensions, and libraries should be placed in dedicated workspace packages.

