---
applyTo: "packages/examples/backend/**"
---

# Error Handling

`example-backend` has exactly one error root: `AzFunctionsRuntimeError` (exported from `@herrromich/az-functions`).
Every error class the app defines or throws — whatever layer it lives in — must descend from it, directly or
indirectly. Never throw a bare `Error`, a subclass of `Error` that skips `AzFunctionsRuntimeError`, or a plain
string/object.

```ts
// shared/applications/orders/orders.errors.ts
export class OrderNotFoundError extends AzFunctionsRuntimeError {}
```

`AzFunctionsErrorOptions` (`{ cause?, details? }`) is the standard constructor options bag every
`AzFunctionsRuntimeError` accepts — reuse it instead of inventing a parallel options shape.

## 1. Domain/shared services throw their own runtime error, never an HTTP one

When a service in `src/shared/**` needs to signal a failure, define a **specific** error class for that
failure mode, extending `AzFunctionsRuntimeError` (directly, or via a feature-level abstract base — see §2),
and throw that instead. Colocate it with the code that throws it (same file or a sibling `<feature>.errors.ts`).

```ts
// shared/persistence/utilities/repository.model.ts
export class GeoJsonConversionError extends AzFunctionsRuntimeError {}

export function geoJsonPointToPoint(geoJsonPoint: GeoJSONPoint): Point {
  if (geoJsonPoint.coordinates.length !== 2) {
    throw new GeoJsonConversionError(
      `Invalid GeoJSON Point coordinates length: ${geoJsonPoint.coordinates.length} expected 2`,
    );
  }
  // ...
}
```

## 2. Feature error hierarchies

If a feature/module has more than one related failure mode, define a small hierarchy instead of one flat
error class:

```ts
// shared/applications/orders/orders.errors.ts
export abstract class OrdersError extends AzFunctionsRuntimeError {}
export class OrderNotFoundError extends OrdersError {}
export class OrderAlreadyCancelledError extends OrdersError {}
```

This lets a consumer (e.g. `interfaces/rest`, per `az-functions-app-rest.instructions.md` §6.3) catch broadly
(`instanceof OrdersError`) when any failure in the feature should be handled/translated the same way, or
narrowly per subclass when they don't. Only introduce the hierarchy when there is more than one concrete
error for the feature — a single failure mode is just one class extending `AzFunctionsRuntimeError` directly
(§1).

## 3. Placement & naming reference

| Concern                                | Location                                                              | Extends                                              |
|-------------------------------------------|--------------------------------------------------------------------------|---------------------------------------------------------|
| Domain/feature runtime error             | Colocated with the throwing service, e.g. `shared/applications/<feature>/<feature>.errors.ts`, `shared/persistence/...`, `shared/app-config/...`, `shared/startup/...` | `AzFunctionsRuntimeError` (directly, or via the feature's abstract base) |
| Feature error hierarchy base (optional)  | Same file/folder as its concrete subclasses                              | `AzFunctionsRuntimeError`                               |

This hierarchy is shared by every non-REST layer alike — `src/shared/**` and `src/interfaces/event-hub/**`
both throw/reuse domain runtime errors (§1/§2) the same way; neither ever throws a `BaseHttpTriggerError`
descendant, since that's exclusively an `interfaces/rest/**` concern (see the note above).

