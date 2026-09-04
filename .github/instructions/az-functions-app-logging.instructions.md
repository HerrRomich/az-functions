---
applyTo: "packages/examples/backend/**"
---

# Logging — Structured Logging Conventions

`example-backend` uses the structured logging system built into `@herrromich/az-functions` (Winston-based, with
hierarchical log levels and per-invocation context metadata). This file governs how the app injects, names, and
uses loggers. See the framework's `README.md` ("Logging" section) for the full public API reference — this file
is about how `example-backend` specifically is expected to use it.

## 1. Prefer the injected framework `Logger`, injected via `LOGGER_FACTORY` with no parameter

Never call `console.log`/`console.error`/etc. and never construct a Winston (or any other) logger by hand.
Always inject the framework `Logger` via `LOGGER_FACTORY` (`@herrromich/az-functions`) and use it for every
diagnostic message the app emits — the framework's log-level filtering, context metadata, sanitization, and
optional OpenTelemetry export only apply to loggers created this way.

Every class that needs a logger injects `LOGGER_FACTORY` and calls it with no arguments in the constructor —
this lets the app-global `LoggerNameProvider` (§2) derive the name from the call stack automatically, so the
logger name always reflects where the class actually lives, with zero per-class bookkeeping:

```ts
import { inject } from 'inversify';
import { Logger, LOGGER_FACTORY, LoggerFactory } from '@herrromich/az-functions';

export class OrdersRepository {
  private readonly logger;

  constructor(@inject(LOGGER_FACTORY) loggerFactory: LoggerFactory /* ...other deps... */) {
    this.logger = loggerFactory();
  }
}
```

Passing an explicit name (`loggerFactory('some.name')`) is **only** for the rare case where a logger is needed
somewhere the call stack can't identify a meaningful owning class — e.g. inside a Kysely `log` callback, which
isn't a class method:

```ts
// shared/persistence/module/index.ts
export const PERSISTENCE_KYSELY_LOGGER_NAME = `${LOGGER_NAME_PREFIX}.shared.persistence.kysely`;
// ...
const logger = logFactory(PERSISTENCE_KYSELY_LOGGER_NAME);
```

Don't reach for an explicit name as a shortcut inside an ordinary class — always call `loggerFactory()`
there.

## 2. `LoggerNameProvider` expresses the structure of the application

The app binds exactly one `LOGGER_NAME_PROVIDER` (`@herrromich/az-functions`), in `shared/logger/index.ts`
(`LoggerModule`). It derives a logger's name from the call stack of whoever asked for it, mirroring the source
folder structure and the requesting class name — this is what makes logger names reflect the app's own module
layout, the same way the framework's own internal loggers are named `${SYSTEM_LOGGER_NAME_PREFIX}.<module-path>.<ClassName>`.

- The application-wide prefix is a single exported constant, colocated in `shared/logger/logger.model.ts`,
  and **must start with `#`** (mirroring `SYSTEM_LOGGER_NAME_PREFIX = '#az-functions'`):

  ```ts
  // shared/logger/logger.model.ts
  export const LOGGER_NAME_PREFIX = '#example-backend';
  ```

- The provider itself is bound once, in the app's cross-cutting `LoggerModule`:

  ```ts
  // shared/logger/index.ts
  export const LoggerModule = new ContainerModule(({ bind }) => {
    bind(LOGGER_NAME_PROVIDER).toFactory(() => {
      const regexp =
        /^\s*at\s+(?:new\s+)?([A-Za-z0-9_$]+)\s+\(.*packages[\\/]examples[\\/]backend[\\/]src[\\/](.+)\/[^\\/]+:\d+:\d+\)$/;
      return (stackEntry?: string) => {
        const stackLines = stackEntry?.split('\n') ?? [];
        let callerLine = stackLines.shift();
        while (callerLine !== undefined) {
          const match = regexp.exec(callerLine.trim());
          if (match !== null) {
            return `${LOGGER_NAME_PREFIX}.${match[2]?.replace(/\//g, '.')}.${match[1]}`;
          } else {
            callerLine = stackLines.shift();
          }
        }
      };
    });
    // ...also binds LOG_LEVEL_PROVIDER, see §6...
  });
  ```

  This produces names like `#example-backend.shared.applications.orders.OrdersRepository`.

- Register `LoggerModule` once in `src/index.ts`'s `modules` array (see `az-functions-app-init.instructions.md`)
  — never bind `LOGGER_NAME_PROVIDER`/`LOG_LEVEL_PROVIDER` anywhere else, there must be exactly one app-global
  name-and-level policy.

## 3. Context metadata is scoped to the invocation and persists until changed

`adjustContextLoggerMetadata` (`@herrromich/az-functions`) attaches metadata to the current
`PlatformContextManager`-scoped (`AsyncLocalStorage`) invocation context, **per log level**. Once set, that
metadata is included in **every subsequent log message at the matching level within the same invocation**
— it doesn't need to be re-passed on every `logger.xxx(...)` call, and it stays until either overwritten by a
later call to `adjustContextLoggerMetadata` or the invocation ends (the platform resets context at the start of
every HTTP request / Event Hub batch).

The framework itself already does this for you at the trigger boundary — `HttpHandlerFactory` and
`EventHubHandlerFactory` call it once per request/batch with `operationId`/`triggerId` and the full
registration data. Application code should follow the same pattern for whatever **domain**-identifying data
it resolves — the examples below are what that looks like in `interfaces/rest/**`/`interfaces/event-hub/**`
code, not the framework's own internal call.

Use it whenever you resolve a piece of context-identifying application data that should show up on every log
line for the rest of the invocation (a domain identifier from the path, a resolved subject/user id, a
correlation id, …). Two ways to scope it, pick based on how long the metadata should live:

- **Set once at the boundary of the trigger method** (a controller operation method, an Event Hub handler
  method) — the normal case. Once set there, it naturally applies to everything downstream in that same
  invocation (mappers, repositories, services), because they all run inside the same platform context. A
  single resolved identifier is often enough on its own:

  ```ts
  // interfaces/rest/orders/customers/orders.controller.ts
  async getOrderById(@AuthCtx() authContext: AuthContext, @PathParam(...) orderId: string): Promise<OrderDto> {
    adjustContextLoggerMetadata(this.contextManager, {
      warn: { orderId },
      error: { orderId, subject: authContext.principal?.subject },
      silly: { orderId, subject: authContext.principal?.subject },
    });
    // ...rest of the method: every logger.warn/error/silly call from here on
    // (including from injected repositories/mappers) will include this metadata...
  }
  ```

  It's just as common to combine an id with a related, human-readable field once it's been resolved, so
  later log lines don't need a separate lookup to make sense of the id:

  ```ts
  // interfaces/rest/console/trucks/trucks.controller.ts
  async getTruckById(@PathParam({ name: 'truckId', schema: IdDtoSchema }) truckId: string): Promise<TruckDto> {
    const truck = await this.trucksRepository.getTruckById(truckId);
    if (truck === undefined) {
      throw new NotFoundError('Truck not found.', { details: { truckId } });
    }
    adjustContextLoggerMetadata(this.contextManager, {
      warn: { truckId, licensePlate: truck.licensePlate },
      error: { truckId, licensePlate: truck.licensePlate },
      silly: { truckId, licensePlate: truck.licensePlate },
    });
    // ...rest of the method: every logger.warn/error/silly call from here on
    // (including from injected repositories/mappers) will include this metadata...
    return this.trucksMapper.toDto(truck);
  }
  ```

- **Create a nested context** via `PlatformContextManager.runWith(...)` only when metadata must apply to a
  narrower sub-scope and disappear again afterwards (e.g. iterating a batch and wanting per-item metadata that
  shouldn't leak to the next item). This is the exception, not the default — most metadata belongs at the
  trigger-method boundary and lives for the rest of the invocation.

Don't repeat the same fields as inline metadata on every individual `logger.xxx(message, {...})` call when
they're already invocation-wide — set them once via `adjustContextLoggerMetadata` instead.

## 4. It's fine to log at several levels for the same event

A single point in the code may call `logger.info(...)`, `logger.debug(...)`, and `logger.silly(...)`
back-to-back for the same event, each with a different amount of detail — this is a deliberate, expected
pattern, not redundancy:

```ts
// interfaces/rest/orders/orders.controller.ts
this.logger.info('Fetching order.');
this.logger.debug(`Fetching order by id=${orderId}.`, { subject: userAccount.subject, customerIds });
this.logger.silly(`Fetching order by id=${orderId}.`, { subject: userAccount.subject, customers: customersForUser });
```

Because log level is configured **per logger name** (§6, `LOG_LEVEL_PROVIDER`/`TrieSearchService`), only the
levels actually enabled for that specific class/module are emitted at runtime — logging at `debug`/`silly` in
addition to `info` costs nothing extra in production, and it means a specific class can be bumped to a more
verbose level (via the log-levels endpoint or config) to get much richer tracing *without touching the code*.
Reach for this whenever a lower level's extra detail would help future troubleshooting for that particular
class/service, not just at info-level lifecycle points.

## 5. Don't log right before throwing — enrich the error instead; log only where it's actually handled

Logging an error and then throwing (or rethrowing) it is redundant and produces duplicate noise: the framework
already logs it for you at the trigger boundary (`HttpHandlerFactory` logs `warn` with a `BaseHttpTriggerError`'s
`details` when a controller throws one; `EventHubHandlerFactory` logs `error` with the propagated error when an
Event Hub handler throws). Follow this rule instead:

- When you need to signal a failure by throwing (a domain `AzFunctionsRuntimeError` from `shared/**`, or a
  `BaseHttpTriggerError` descendant from `interfaces/rest/**` — see `az-functions-app-errors.instructions.md`),
  put the diagnostic information into that error's `details` (`AzFunctionsErrorOptions`), not into a
  `logger.error(...)` call made right before the `throw`:

  ```ts
  // Avoid: logging and then throwing duplicates the failure in the logs
  this.logger.error(`Order with id=${orderId} not found`, { orderId });
  throw new NotFoundError(`Order with id=${orderId} not found`);

  // Prefer: the error carries its own diagnostic data; the framework logs it once, at the boundary
  throw new NotFoundError(`Order with id=${orderId} not found`, { details: { orderId } });
  ```

- Only call a logging method for an error when your code is the one **handling** that error — i.e. it's
  caught with a specific `instanceof` check and **not rethrown** (see §3 in `az-functions-app-errors.instructions.md`
  for the equivalent rule about translating errors). If you catch an error and rethrow a different one (or
  the same one), don't log in between — the eventual thrower/catcher at the boundary is responsible for
  logging. If you catch an error and recover without rethrowing anything, that's the one place nothing else
  will ever see the failure, so log it there (`warn` or `error`, with `error` in the metadata so the stack/cause
  is preserved):

  ```ts
  try {
    await this.redisClient.publish(channel, message);
  } catch (e) {
    // Handled here (no rethrow): recovering by skipping the cache invalidation is acceptable, so log it.
    this.logger.warn('Failed to publish cache invalidation event; continuing without it', { channel, error: e });
  }
  ```

## 6. Log levels — what each one means

Levels, ordered from highest to lowest severity (matches the framework's `LOG_LEVELS`):

| Level     | Use it for                                                                                                     |
|-----------|------------------------------------------------------------------------------------------------------------------|
| `error`   | A failure your code is actually handling and not rethrowing (§5), or an unrecoverable condition being reported. |
| `warn`    | Something unexpected happened but the operation still completed in a degraded/recovered way (also what the framework itself logs for `BaseHttpTriggerError`s). |
| `info`    | High-level lifecycle markers of a business operation — one line for "an operation started/succeeded", with little to no payload. |
| `http`    | HTTP request/response lifecycle logging; mainly used by the framework's own `http-controller` internals — reach for it in app code only for genuinely HTTP-transport-level events. |
| `verbose` | Extra detail one step below `info` — useful for tracing which branch/decision path an operation took, without dumping full payloads. |
| `debug`   | Detailed diagnostic data (resolved arguments, query parameters, intermediate DTOs) meant to be turned on per class/module while troubleshooting — not part of the default production level. |
| `silly`   | Full trace-level detail — entire request/response objects, complete argument lists, everything. The most granular level, meant to be enabled for one specific class/module at a time, not globally. |

Per-logger verbosity is configured via `LOG_LEVEL_PROVIDER`, implemented in `example-backend` as
`TrieSearchLogLevelProvider` (`shared/logger/trie-search-log-level.provider.ts`), which matches logger names
hierarchically by dot-separated prefix (longest match wins). Add new hierarchical overrides there (e.g. to
quiet down or open up a whole subsystem), rather than hardcoding a level check in application code:

```ts
// shared/logger/trie-search-log-level.provider.ts
export class TrieSearchLogLevelProvider extends TrieSearchService<LogLevel> implements LogLevelProvider {
  constructor(@inject(DEFAULT_LOG_LEVEL) @optional() defaultLogLevel: LogLevel) {
    super('.', defaultLogLevel);
    this.set(SYSTEM_LOGGER_NAME_PREFIX, 'silly'); // framework-internal loggers
    this.set(PERSISTENCE_KYSELY_LOGGER_NAME, 'error'); // Kysely SQL logs: errors only
  }
  // ...
}
```

Because `TrieSearchService` supports runtime `get`/`set`/`getAll`, levels can also be adjusted live without a
redeploy — see `interfaces/rest/logging/log-levels/log-levels.controller.ts` for the reference
`GET`/`PUT`/`DELETE /log-levels` endpoints that expose this.

