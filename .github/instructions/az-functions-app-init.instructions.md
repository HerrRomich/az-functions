---
applyTo: "packages/examples/backend/src/{index,init}.ts"
---

# Initializing the `@herrromich/az-functions` Platform

The composition root of an `az-functions` app is exactly two files: `src/init.ts` and `src/index.ts`.
Never call `startPlatform` more than once per app, and never split it across additional entry files.

## 1. `src/init.ts` — runtime prerequisites (no framework calls here)

Must run its side effects **before anything else in the app is imported**. Contents, in order:

```ts
import * as sourceMapSupport from '@forks/source-map-support'; // stack traces mapped to TS source
import 'reflect-metadata'; // required for decorator metadata (experimentalDecorators/emitDecoratorMetadata)

sourceMapSupport.install({ environment: 'node', overrideRetrieveFile: false });
```

- If any DTO/schema uses OpenAPI-annotated Zod (`.openapi(...)`), also call `extendZodWithOpenApi(z)` from
  `@asteasolutions/zod-to-openapi` here, once, before any schema module is imported:

  ```ts
  import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
  import { z } from 'zod';

  extendZodWithOpenApi(z);
  ```

  This patches the `zod` module with the `.openapi(...)` method used by DTO schemas; skipping it means any
  schema calling `.openapi(...)` throws at import time. Jest suites need the same call in `jest.setup.mjs`
  (each test file re-imports `zod` in isolation), so it isn't covered by importing `src/init.ts` in tests.
- `init.ts` must not import controllers, handlers, or modules — it only sets up the runtime.

## 2. `src/index.ts` — composition root

```ts
import { OtelConfiguration, startPlatform } from '@herrromich/az-functions';

import './init'; // side effects only — must precede any decorated class import below

import { EventHubHandlers } from '@fleet-sight/interfaces/event-hub/index';
import { ConsoleRestModule, HttpControllers, OrdersRestModule, RestApplications } from '@fleet-sight/interfaces/rest';
import { AppConfigModule } from '@fleet-sight/shared/app-config';
// ...import remaining shared/<cross-cutting> and applications/<feature> ContainerModules...

const otelConfiguration: OtelConfiguration | undefined =
  process.env.APPLICATIONINSIGHTS_CONNECTION_STRING !== undefined
    ? {
        applicationInsightsConnectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
        serviceName: process.env.WEBSITE_DEPLOYMENT_ID,
        serviceVersion: '1.0.0',
        serviceInstanceId: process.env.WEBSITE_INSTANCE_ID,
      }
    : undefined;

startPlatform({
  triggerHandlerClasses: [...HttpControllers, ...EventHubHandlers],
  restApplications: [...RestApplications],
  modules: [/* AppConfigModule, PersistenceModule, ...feature ContainerModules */],
  loggerConfiguration: { otelConfiguration },
});
```

Rules:
- `import './init'` must come before any import of a controller/handler/module (they use decorators that
  need `reflect-metadata` already registered). Do not put unrelated logic between the imports and the
  `startPlatform(...)` call.
- **Never hand-list individual controllers/handlers/applications here.** Aggregate them via the barrel
  exports in `src/interfaces/rest/index.ts` (`HttpControllers`, `RestApplications`) and
  `src/interfaces/event-hub/index.ts` (`EventHubHandlers`); adding a new controller/handler means updating
  those barrels, not `index.ts`.
- `modules` lists every `ContainerModule` the app needs (cross-cutting `shared/*` modules first, then
  `applications/<feature>` modules) — Inversify loads them via `platformContainer.loadSync(...)`.
- `loggerConfiguration.otelConfiguration` is optional; only build it when
  `APPLICATIONINSIGHTS_CONNECTION_STRING` is set.

## `PlatformConfiguration` reference

| Property                | Type                    | Required | Notes                                            |
|--------------------------|-------------------------|----------|---------------------------------------------------|
| `triggerHandlerClasses` | `TriggerHandlerClass[]` | yes      | HTTP controllers + Event Hub handlers.             |
| `restApplications`      | `RestApplication[]`     | no       | Omit to get a default generated OpenAPI doc.       |
| `modules`               | `ContainerModule[]`     | yes      | Loaded into the platform IoC container.            |
| `loggerConfiguration`   | `LoggerConfiguration`   | no       | Winston + optional OTel/App Insights export.       |

`startPlatform` reads `PLATFORM_MODE` (`start` | `print-open-api`) from the environment to decide whether
to actually start the Azure Functions triggers or just print the OpenAPI spec — this is set outside the app
code (e.g. `npm`/CI script), never hardcoded in `index.ts`.


