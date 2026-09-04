---
applyTo: "**"
---

# Git Naming Conventions — Branches, Commits & Tags

This monorepo publishes **two** independently-versioned npm packages
(`@herrromich/az-functions`, `@herrromich/transaction-manager`) alongside several **private, unpublished**
workspace packages (the `examples/*` reference apps, `forks/source-map-support`, `utilities/test-utilities`)
and Terraform `infra/`. Branch and commit names must make two things obvious at a glance, without opening
the diff:

1. **What kind of change** it is (feature, fix, chore, …) — meaningful distinctions here only apply to the
   two publishable scopes; the `repo` scope is always `chore` (see §2/§3).
2. **Which publishable package (if any) it affects** — because that determines whether it drives an npm
   version bump at all.

## 1. Package scopes

Use exactly these scope keywords in branches/commits. Only the two publishable packages get their own
scope; **everything else in the monorepo — every private workspace package, `infra/`, and root/shared
config — is covered by the single `repo` scope**:

| Scope                 | Path                                    | Publishable to npm? |
|------------------------|------------------------------------------|----------------------|
| `az-functions`         | `packages/extensions/az-functions`        | ✅ `@herrromich/az-functions` |
| `transaction-manager`  | `packages/extensions/transaction-manager` | ✅ `@herrromich/transaction-manager` |
| `repo`                 | everything else: private workspace packages (`packages/examples/backend`, `packages/examples/frontend`, `packages/examples/security`, `packages/forks/source-map-support`, `packages/utilities/test-utilities`), `infra/`, root config, `.github/**`, `docs/**`, and files shared by every package (`eslint.base.config.mjs`, `tsconfig.base.json`, `pnpm-workspace.yaml`, `babel.base.config.mjs`, `webpack.base.config.mjs`, `jest.base.config.mjs`) | ❌ n/a — no independent release |

Do not reintroduce per-package scopes for the private packages (`example-backend`, `example-frontend`,
`example-security`, `source-map-support`, `test-utilities`, `infra`, …) — they never have their own semver
contract to track, so splitting them out only adds noise. Name the affected private package in the commit
body/summary text instead, e.g. `chore(repo): upgrade angular material in example-frontend`.

### Choosing between a publishable scope and `repo`

**A publishable scope (`az-functions` / `transaction-manager`) is reserved *exclusively* for commits that
change that package's own productive/functional behavior or public contract** (`feat`, `fix`, `security`).
It is never used for anything else — not for tooling, not for docs, not for tests, not for internal
refactors with no behavioral effect — even when every changed file lives inside that package's own folder.

- **Use `az-functions` / `transaction-manager`** only when the diff changes that package's shipped
  functionality or public contract, **even if most of the diff lives elsewhere** — e.g. a
  `transaction-manager` behavior fix plus its consuming test/usage update in `example-backend` is still
  scoped `transaction-manager` (it's the driver: a functional change to a publishable package that requires
  companion changes in private packages stays scoped to that publishable package, never split off to
  `repo`). Never downgrade a publishable package's functional change to `repo` just because the diff touches
  other files too.
- **Use `repo` for everything that is not a productive/functional change to a publishable package** —
  this includes tooling, CI, docs, dependency bumps that don't change behavior, internal refactors with no
  external effect, workspace maintenance, and **all test-only changes, with no exception** — even a test
  added or fixed entirely inside `packages/extensions/az-functions/**` or
  `packages/extensions/transaction-manager/**` stays `repo`, because it does not change what ships to
  consumers of the package. Only actual `feat`/`fix`/`security` behavior changes ever earn the package's own
  scope.
- **Never scope a commit `repo` if it changes what a publishable package does** — always use the specific
  package scope in that case, regardless of how small the functional change is.
- **A single commit must never contain productive/functional changes (`feat`/`fix`/`security`) to more than
  one publishable package.** A scope is always exactly one of `az-functions`, `transaction-manager`, or
  `repo` — there is no combined/multi scope. Mixing functional changes to both publishable packages in one
  commit is a naming/process **error and is not an acceptable use case** — this must be treated as
  exceptional and must not happen in normal practice. If a change genuinely needs functional edits to both
  `az-functions` and `transaction-manager`, it **must** be split into separate commits/PRs, one per package
  scope, with no exceptions.

## 2. Branch naming

```
<type>/<scope>/<kebab-case-summary>[-breaking]
```

- `<type>` — one of the types in the table below.
- `<scope>` — one of the keywords from §1.
- `<kebab-case-summary>` — 3–6 words, imperative, no ticket ID needed (link the PR to an issue instead).
- `-breaking` — **only** ever appended when `<scope>` is a **publishable** package (`az-functions` /
  `transaction-manager`) *and* the change requires a **major** version bump (removes/renames public API,
  changes peer dependency ranges incompatibly, changes documented HTTP/behavioral contracts). Never append
  it for private scopes — they have no semver contract to break.

| Type       | Use for                                                                                   | Version bump (publishable scopes only) |
|------------|--------------------------------------------------------------------------------------------|------------------------------------------|
| `feature`  | New, additive capability                                                                    | minor (major with `-breaking`)           |
| `fix`      | Bug fix, behavior correction, or a performance improvement with no other behavior change     | patch (major with `-breaking`, rare)     |
| `security` | Vulnerability remediation (dependency bump or code fix in response to a CVE/advisory)        | patch (or minor if a dependency major bump is unavoidable) |
| `chore`    | Everything else with no user-visible behavior change: tooling, build/CI config, dependency bumps, internal refactors, workspace maintenance, docs, tests, and reverts | none |

**`repo`-scoped changes are always `chore`.** `feature`/`fix`/`security` only ever apply to the
`az-functions`/`transaction-manager` scopes, because they exist to signal an npm version bump — and `repo`
never drives one. This holds regardless of how significant the underlying change is (a new feature in
`example-backend`, a CVE fix in a private package's dependency, a critical bug fix in `infra` — all of these
are still `chore/repo/...` branches and `chore(repo): ...` commits). Name the specific private
package/folder and the nature of the change in the summary/body instead of trying to express it via `<type>`.

Kept deliberately short: these 4 cover every distinction that actually matters in this repo — does it bump a
publishable package's version, and if so by how much. Don't reintroduce a longer type list
(`docs`/`test`/`refactor`/`perf`/`build`/`ci`/`revert`/`style`, …) just to be exhaustive — fold anything that
isn't `feature`/`fix`/`security` into `chore`, including:
- **Docs-only** changes (`chore(repo): update README installation steps`).
- **Test-only** changes, always `repo` even inside a publishable package's own folder
  (`chore(repo): add missing edge-case test for savepoint rollback in transaction-manager`).
- **Anything scoped `repo`**, no matter its nature (`chore(repo): fix vulnerable transitive dependency`,
  `chore(repo): add orders pagination to example-backend`) — see the rule above.
- **Reverts** — use `chore(<scope>): revert "<original summary>"` and reference the original commit/PR in
  the body (`Reverts abc1234`). Exception: if the reverted change already shipped in a publishable package's
  release and the revert itself needs its own release, branch/commit it as a `fix` (or `fix!` if reverting a
  breaking change) so it gets the right version bump — don't hide a real, user-facing correction behind
  `chore` just because it happens to be a revert. (This exception only applies to publishable scopes; `repo`
  reverts are always `chore` too.)

Release/hotfix branches don't follow the `<type>/<scope>/<summary>` shape — see §4.

### Examples

| Use case                                                                 | Branch name                                             |
|----------------------------------------------------------------------------|------------------------------------------------------|
| New minor feature in the core extension                                   | `feature/az-functions/openapi-error-response-schemas` |
| Breaking API change in the core extension                                 | `feature/az-functions/logger-factory-rework-breaking` |
| Bug fix in transaction-manager                                            | `fix/transaction-manager/nested-savepoint-rollback`   |
| Dependency vulnerability fix (as seen in existing history)                 | `chore/repo/fix-vulnerabilities`                      |
| New feature in the example backend (private — no `-breaking`, ever)        | `chore/repo/example-backend-orders-pagination`        |
| Config-only change to a private example app                               | `chore/repo/example-frontend-upgrade-angular-material` |
| Workspace-wide tooling change                                              | `chore/repo/upgrade-eslint`                            |
| CI workflow tweak                                                          | `chore/repo/cache-openapi-generator`                    |
| Docs-only update to these instructions                                     | `chore/repo/git-naming-conventions`                    |

## 3. Commit messages — Conventional Commits

```
<type>(<scope>)[!]: <imperative, lower-case summary, no trailing period>

<body — explain *why*, wrap ~100 cols, optional>

<footer(s) — optional>
```

- `<type>` and `<scope>` — same vocabularies as §1/§2 (`type` values: `feature` → use `feat` here to match
  the Conventional Commits spec tooling expects; all other types keep their branch-type spelling: `fix`,
  `security`, `chore`).
- **`repo`-scoped commits are always `chore(repo): ...`** — never `feat(repo)`/`fix(repo)`/`security(repo)`,
  regardless of how significant the change is (see §2).
- `!` immediately after `(scope)` marks a **breaking change** — only for `az-functions`/`transaction-manager`
  scopes, and only when the corresponding PR is also on a `-breaking` branch. It **must** be paired with a
  `BREAKING CHANGE:` footer explaining the migration.
- Header ≤ 72 characters. Imperative mood ("add", not "added"/"adds").
- Reference issues in the footer: `Refs #123` or `Closes #123` — don't cram the issue number into the
  summary line (the old `fixed actions (#6)` style in this repo's history predates this convention; new
  commits should follow the format below instead).
- One logical change per commit where practical; the PR title (used as the squash-merge commit message)
  must itself be a valid Conventional Commit header in this same format.

### Examples

```
feat(az-functions): add OpenAPI schema generation for 429 responses

Adds a documented rate-limit response shape to RestApplication-generated
specs so generated clients can type-check on 429s instead of `unknown`.

Refs #42
```

```
fix(transaction-manager): release savepoint on nested rollback

Refs #57
```

```
feat(az-functions)!: replace LOGGER_FACTORY token with LoggerProvider

BREAKING CHANGE: consumers binding LOGGER_FACTORY must switch to the new
LoggerProvider interface; see README "Logging" section for the migration.
```

```
chore(repo): fix vulnerable transitive dependency (GHSA-xxxx-xxxx-xxxx)

Refs #61
```

```
chore(repo): bump pg to catalog-pinned version in example-backend
```

```
chore(repo): add git naming conventions instructions
```

```
chore(repo): add missing edge-case test for savepoint rollback in transaction-manager
```

## 4. Releases & tags

Because `az-functions` and `transaction-manager` version independently, **tags and release branches must be
namespaced per package** — a bare `v1.2.0` tag is ambiguous in this repo.

- **Tag format**: `<scope>@<semver>`, e.g. `az-functions@1.2.0`, `transaction-manager@2.0.0`. Private
  packages are never tagged (they have no independent release).
- **Release branch format**: `release/<scope>-v<semver>`, e.g. `release/az-functions-v1.2.0`. (Existing
  history predates per-package tagging and used bare `release/v1.0.0`/`release/v1.0.1` — continue the
  namespaced form for all new releases now that two packages are published independently.)
- **Hotfix branch format** (patch cut from an already-published version): `hotfix/<scope>-v<semver>`, e.g.
  `hotfix/az-functions-v1.1.1`.
- The release branch's version-bump commit uses `chore(<scope>): release v<semver>` as its header and
  updates that package's `package.json#version` (and `README.md`/changelog if present) only — never bump
  both publishable packages' versions in the same commit.

### Examples

| Use case                                                                   | Branch name                            |
|------------------------------------------------------------------------------|------------------------------------------|
| Cutting a minor release for the core extension                              | `release/az-functions-v1.2.0`           |
| Cutting a major (breaking) release for the core extension                   | `release/az-functions-v2.0.0`           |
| Cutting a patch release for transaction-manager                             | `release/transaction-manager-v2.1.3`    |
| Hotfixing a patch bug found in an already-published core extension version  | `hotfix/az-functions-v1.1.1`            |
| Hotfixing a critical bug in an already-published transaction-manager release| `hotfix/transaction-manager-v2.0.1`     |

## 5. Non-publishable projects

`example-backend`, `example-frontend`, `example-security`, `source-map-support`, `test-utilities`, and
`infra` all share the single `repo` scope (see §1) — none of them gets its own scope keyword:

- **Always use `chore`** — never `feature`/`fix`/`security` — since `repo` never drives a version bump (see
  §2). Name the specific private package/folder and the nature of the change in the summary or body so the
  affected area is still obvious (e.g. `chore(repo): add orders pagination to example-backend`).
- **Never** append `-breaking` to a branch name or `!` to a commit for `repo` — there is no semver contract
  to break. If an `example-security` change breaks its contract with `example-frontend` or `example-backend`,
  call that out in the commit body instead (e.g. "also requires updating example-frontend's token-claims
  mapping in this same PR") rather than using breaking-change syntax.
- `infra` changes affecting Terraform state/resources should use `chore(repo): ...` (naming `infra` in the
  summary) — even for genuinely new provisioned resources, since `infra` is covered by the `repo` scope.
- If a change to one of these private projects is only needed to support/exercise a functional change in
  `az-functions` or `transaction-manager` (e.g. updating `example-backend` to use a new API), fold it into
  that publishable package's scope instead of `repo` — see §1's driver rule.



