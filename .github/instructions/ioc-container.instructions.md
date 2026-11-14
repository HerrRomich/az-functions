---
applyTo: "packages/{extensions/az-functions,examples/backend}/**"
---

# IoC Container Usage

The Azure Functions extension and example backend use Inversify for dependency injection.

- Prefer constructor injection for dependencies between services. Avoid resolving a service with
  `container.get(...)` inside another service; reserve direct container access for composition, registration,
  and cases where runtime resolution is essential.
- Prefer a class constructor as the service identifier when the dependency is represented by a class:
  register it with `bind(MyService).toSelf()`. With emitted constructor metadata, a parameter typed as
  `MyService` can be injected without `@inject(MyService)`; use the explicit decorator when needed to
  disambiguate or override the inferred identifier.
- When there is no suitable runtime class identifier (for example, an interface, function, primitive, or
  configuration value), use the shared `serviceIdentifier<T>(description)` helper and annotate the
  constructor parameter with `@inject(IDENTIFIER)`. Set `T` to the exact value type consumers inject, and
  define the identifier once for reuse by registrations and consumers.
- Use a dot-separated diagnostic name for identifiers created with `serviceIdentifier`: `<PackageOrApp>.<Domain>.<Service>`.
  Use stable logical names, with PascalCase segments; do not encode source-file paths or use sentence-like
  descriptions. For example, `AzFunctions.Logger.LoggerProvider`,
  `AzFunctions.Platform.ContextManager`, or `FleetSight.Persistence.DbFactory`.
- Mark classes constructed by Inversify with `@injectable()` as the default. Inversify recommends it for
  service classes, and it is required when relying on emitted constructor metadata for inferred injection.
  A framework class decorator that applies `@injectable()` (such as `@HttpController`) also satisfies this.
  The shared TypeScript configuration enables `experimentalDecorators` and `emitDecoratorMetadata`; ensure
  `reflect-metadata` is loaded before decorated classes are evaluated.

The description passed to `serviceIdentifier` labels the symbol for diagnostics; the symbol itself is the
service identifier. Class identifiers and symbols should both be imported from their defining module rather
than recreated at injection sites.

See the Inversify 7 docs for [decorators](https://inversify.io/docs/7.x/api/decorator/) and
[class metadata-based binding](https://inversify.io/docs/7.x/fundamentals/binding/).
