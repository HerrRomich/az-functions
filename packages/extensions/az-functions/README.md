# @herrromich/az-functions

**az-functions** extension for Azure Functions in Node.js

[![npm version](https://badge.fury.io/js/%40herrromich%2Faz-functions.svg)](https://badge.fury.io/js/%40herrromich%2Faz-functions) [![npm downloads](https://img.shields.io/npm/dm/%40herrromich%2Faz-functions.svg)](https://www.npmjs.com/package/@herrromich/az-functions) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

**az-functions** extends the Azure Functions programming model for Node.js (v4) by introducing a powerful structure for building scalable and maintainable serverless applications.
It integrates several key concepts:

- **Inversion of Control (IoC) Container:**
  Using [InversifyJS](https://inversify.io/) to manage dependencies and ensure proper decoupling of components.
- **TypeScript Decorators:**
  Declaratively define HTTP controllers, Event Hub handlers, and their arguments using decorators.
- **Input Validation:**
  Integrating the [Zod](https://zod.dev/) validation library to ensure that all inputs (e.g., HTTP request bodies, Event Hub messages) are properly validated before processing.
- **OpenAPI Code-First Generation:**
  Automatically generating OpenAPI (Swagger) definitions based on the controller code, following a code-first approach.
- **Structured Logging:**
  Built-in logging via [Winston](https://github.com/winstonjs/winston) with optional OpenTelemetry / Application Insights export.

## Installation

```bash
pnpm add @herrromich/az-functions @azure/functions inversify reflect-metadata zod @asteasolutions/zod-to-openapi
```

```bash
npm install @herrromich/az-functions @azure/functions inversify reflect-metadata zod @asteasolutions/zod-to-openapi
```

```bash
yarn add @herrromich/az-functions @azure/functions inversify reflect-metadata zod @asteasolutions/zod-to-openapi
```

> `@azure/functions`, `inversify`, `reflect-metadata`,`zod` and `@asteasolutions/zod-to-openapi` are peer dependencies and must be installed alongside the package.

**az-functions** uses TypeScript decorators.
Configure your `tsconfig.json` accordingly:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

## Quick Start

### Step 1. Initialize `reflect-metadata` and optionally Zod for OpenAPI

```ts
// src/init.ts
import 'reflect-metadata';

import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);
```

### Step 2. Define trigger handler classes

Define your HTTP controllers and/or Event Hub handlers using decorators (see sections below).

### Step 3. Start the platform

Call `startPlatform` with a `PlatformConfiguration` object.
The framework creates and manages the IoC container internally — you provide your `ContainerModule[]` and trigger handler classes:

```ts
// src/index.ts
import './init';

import { startPlatform, OtelConfiguration } from '@herrromich/az-functions';
import { OrdersController } from './controllers/orders.controller';
import { TruckTelemetryHandler } from './handlers/truck-telemetry.handler';
import { AppConfigModule } from './modules/app-config';
import { PersistenceModule } from './modules/persistence';
import { SecurityModule } from './modules/security';
import { ORDERS_REST_APPLICATION } from './applications/orders-api.application';

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
  triggerHandlerClasses: [OrdersController, TruckTelemetryHandler],
  restApplications: [ORDERS_REST_APPLICATION],
  modules: [AppConfigModule, PersistenceModule, SecurityModule],
  loggerConfiguration: {
    otelConfiguration,
  },
});
```

> [!WARNING]
> If you use a bundler like **webpack**, make sure the `init` import is at the very top of your entry module.

#### `PlatformConfiguration`

| Property                 | Type                     | Description                                                            |
|--------------------------|--------------------------|------------------------------------------------------------------------|
| `triggerHandlerClasses`  | `TriggerHandlerClass[]`  | HTTP controller and Event Hub handler classes to register.             |
| `restApplications`       | `RestApplication[]`      | Optional REST application definitions (OpenAPI config, context path).  |
| `modules`                | `ContainerModule[]`      | Inversify container modules loaded into the platform container.        |
| `loggerConfiguration`    | `LoggerConfiguration`    | Optional logger and OpenTelemetry configuration.                       |

## HTTP Controller

### Define a REST Application (optional)

A `RestApplication` defines the OpenAPI metadata and base context path for a group of controllers.
If omitted, the platform generates a default OpenAPI definition with available endpoints.

```ts
// src/applications/orders-api.application.ts
import { RestApplication } from '@herrromich/az-functions';

export const ORDERS_API = 'orders-api';

export const ORDERS_REST_APPLICATION: RestApplication = {
  name: ORDERS_API,
  context: 'orders-api',
  openApiConfig: {
    openapi: '3.0.1',
    info: {
      title: 'Orders API',
      version: '1.0.0',
      description: 'API for Orders Management',
    },
    tags: [
      { name: 'Orders', description: 'CRUD operations for orders' },
    ],
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
};
```

### Define an HTTP Controller

Use `@HttpController` (class decorator) and HTTP method decorators (`@Get`, `@Post`, `@Put`, `@Patch`, `@Delete`, `@Head`) to define routes.
Parameter decorators inject validated request data:

```ts
// src/controllers/orders.controller.ts
import { z } from 'zod';
import { inject } from 'inversify';
import {
  AuthContext,
  AuthCtx,
  BadRequestError,
  Body,
  Get,
  HttpController,
  HttpDirectResponseBuilder,
  Logger,
  LOGGER_FACTORY,
  LoggerFactory,
  NotFoundError,
  NumberSchema,
  Post,
  QueryParam,
} from '@herrromich/az-functions';
import { ORDERS_API } from './orders-api.application';

const OrderDtoSchema = z.object({
  id: z.string().uuid(),
  customerName: z.string(),
  total: z.number(),
}).openapi('OrderDto');

type OrderDto = z.infer<typeof OrderDtoSchema>;

const OrdersResponseSchema = z.object({
  items: z.array(OrderDtoSchema),
  total: z.number(),
}).openapi('OrdersResponse');

type OrdersResponse = z.infer<typeof OrdersResponseSchema>;

const OrderCreateRequestSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(z.object({ productId: z.string(), quantity: z.number() })),
}).openapi('OrderCreateRequest');

type OrderCreateRequest = z.infer<typeof OrderCreateRequestSchema>;

@HttpController({
  application: ORDERS_API,
  path: '/orders',
  tags: ['Orders'],
})
export class OrdersController {
  private readonly logger: Logger;

  constructor(
    @inject(LOGGER_FACTORY) loggerFactory: LoggerFactory,
    private readonly ordersRepository: OrdersRepository,
  ) {
    this.logger = loggerFactory();
  }

  @Get({
    description: 'Get orders with pagination',
    directResponse: {
      status: 200,
      description: 'Paginated list of orders',
      jsonContent: { schema: OrdersResponseSchema },
    },
  })
  async getOrders(
    @AuthCtx() authContext: AuthContext,
    @QueryParam({
      name: 'offset',
      schema: NumberSchema.optional().openapi({ description: 'Items to skip' }),
    })
    offset: number | undefined,
    @QueryParam({
      name: 'limit',
      schema: NumberSchema.optional().openapi({ description: 'Max items to return' }),
    })
    limit: number | undefined,
  ): Promise<OrdersResponse> {
    this.logger.info('Fetching orders.');
    // ... fetch and return orders
  }

  @Post({
    description: 'Create a new order',
    directResponse: {
      status: 201,
      description: 'Order created successfully',
      jsonContent: { schema: OrderDtoSchema },
    },
    responses: {
      '400': { description: 'Bad request error' },
    },
  })
  async createOrder(
    @AuthCtx() authContext: AuthContext,
    @Body({
      description: 'Order creation request',
      schema: OrderCreateRequestSchema,
    })
    request: OrderCreateRequest,
  ): Promise<HttpResponseInit> {
    this.logger.info('Creating order.');
    const order = await this.ordersRepository.create(request);
    return HttpDirectResponseBuilder.builder<OrderDto>()
      .header('Location', `/orders/${order.id}`)
      .jsonBody(order)
      .build();
  }
}
```

### HTTP Decorators Reference

#### Class Decorator

| Decorator                  | Config             | Description                          |
|----------------------------|--------------------|--------------------------------------|
| `@HttpController(config)`  | `ControllerConfig` | Marks a class as an HTTP controller. |

**`ControllerConfig`:**

| Property      | Type         | Description                                                  |
|---------------|--------------|--------------------------------------------------------------|
| `application` | `string?`    | Name of the REST application this controller belongs to.     |
| `path`        | `string`     | Base path for all operations in this controller.             |
| `tags`        | `string[]?`  | OpenAPI tags for this controller.                            |

#### Method Decorators

| Decorator          | HTTP Method |
|--------------------|-------------|
| `@Get(config?)`    | GET         |
| `@Post(config?)`   | POST        |
| `@Put(config?)`    | PUT         |
| `@Patch(config?)`  | PATCH       |
| `@Delete(config?)` | DELETE      |
| `@Head(config?)`   | HEAD        |

Each accepts a `ControllerOperationConfig` (or `ControllerRequestBodyOperationConfig` for POST/PUT/PATCH) with properties like `path`, `description`, `summary`, `directResponse`, `responses`, `authLevel`, etc.

#### Parameter Decorators

| Decorator              | Description                                                                                  |
|------------------------|----------------------------------------------------------------------------------------------|
| `@Body(config)`        | Injects the validated request body. Config: `{ schema, description?, required?, example? }`  |
| `@QueryParam(config)`  | Injects a validated query parameter. Config: `{ name, schema? }`                             |
| `@PathParam(config)`   | Injects a validated path parameter. Config: `{ name, schema? }`                              |
| `@HeaderParam(config)` | Injects a validated header value. Config: `{ name, schema? }`                                |
| `@Request()`           | Injects the raw `HttpRequest` object.                                                        |
| `@AuthCtx()`           | Injects the `AuthContext` with the authenticated principal.                                  |

### HTTP Error Classes

Throw these from controller methods to return appropriate HTTP error responses:

| Class                 | Status Code |
|-----------------------|-------------|
| `BadRequestError`     | 400         |
| `UnauthorizedError`   | 401         |
| `NotFoundError`       | 404         |
| `InternalServerError` | 500         |

### `HttpDirectResponseBuilder`

Use when you need full control over the HTTP response (custom status, headers):

```ts
return HttpDirectResponseBuilder.builder<OrderDto>()
  .header('Location', `/orders/${order.id}`)
  .jsonBody(orderDto)
  .build();
```

## Event Hub Handler

### Define an Event Hub Handler

Use `@EventHubHandler` (class decorator) to specify the Event Hub connection and name.
Use `@OnEventHubTrigger` (method decorator) to define the trigger method:

```ts
// src/handlers/truck-telemetry.handler.ts
import { z } from 'zod';
import { inject } from 'inversify';
import {
  EventHubHandler,
  EventHubMessageWrapper,
  LOGGER_FACTORY,
  LoggerFactory,
  Messages,
  OnEventHubTrigger,
} from '@herrromich/az-functions';

const TelemetryPayloadSchema = z.object({
  deviceId: z.string(),
  temperature: z.number(),
  timestamp: z.string(),
});

type TelemetryPayload = z.infer<typeof TelemetryPayloadSchema>;

@EventHubHandler({
  connection: 'EventHubConnection',
  eventHubName: 'telemetry',
})
export class TruckTelemetryHandler {
  private readonly logger;

  constructor(@inject(LOGGER_FACTORY) loggerFactory: LoggerFactory) {
    this.logger = loggerFactory();
  }

  @OnEventHubTrigger({ cardinality: 'many' })
  async handleTelemetry(
    @Messages({
      withPayload: TelemetryPayloadSchema,
      withEventData: true,
    })
    messages: EventHubMessageWrapper<TelemetryPayload, undefined, undefined, true>[],
  ): Promise<void> {
    this.logger.info(`Received ${messages.length} telemetry messages`, {
      messages: messages.map(msg => ({
        payload: msg.payload,
        enqueuedTimeUtc: msg.eventData.enqueuedTimeUtc,
      })),
    });
  }
}
```

### Event Hub Decorators Reference

#### Class Decorator

| Decorator                   | Config                  | Description                             |
|-----------------------------|-------------------------|-----------------------------------------|
| `@EventHubHandler(config)`  | `EventHubHandlerConfig` | Marks a class as an Event Hub handler.  |

**`EventHubHandlerConfig`:**

| Property       | Type     | Description                                                    |
|----------------|----------|----------------------------------------------------------------|
| `connection`   | `string` | App setting name containing the Event Hub connection string.   |
| `eventHubName` | `string` | Name of the Event Hub to listen to.                            |

#### Method Decorator

| Decorator                      | Config                    | Description                                                    |
|--------------------------------|---------------------------|----------------------------------------------------------------|
| `@OnEventHubTrigger(config?)`  | `OnEventHubTriggerConfig` | Marks the method that handles incoming Event Hub messages.     |

**`OnEventHubTriggerConfig`:**

| Property       | Type                | Default    | Description                                      |
|----------------|---------------------|------------|--------------------------------------------------|
| `triggerId`    | `string?`           | —          | Unique identifier for the trigger.               |
| `consumerGroup`| `string?`           | `$Default` | Consumer group to use.                           |
| `cardinality`  | `'one' \| 'many'?`  | `'many'`   | Whether to receive a single message or a batch.  |
| `extraInputs`  | `FunctionInput[]?`  | —          | Additional Azure Functions inputs.               |
| `extraOutputs` | `FunctionOutput[]?` | —          | Additional Azure Functions outputs.              |

#### Parameter Decorators

| Decorator            | Cardinality | Description                                      |
|----------------------|-------------|--------------------------------------------------|
| `@Message(config?)`  | `one`       | Injects a single validated message wrapper.      |
| `@Messages(config?)` | `many`      | Injects an array of validated message wrappers.  |
| `@RawMessage()`      | `one`       | Injects the raw unvalidated message.             |
| `@RawMessages()`     | `many`      | Injects the raw unvalidated message array.       |

**`EventHubTriggerMessageArgConfig`** (for `@Message` / `@Messages`):

| Property                | Type       | Description                                                                  |
|-------------------------|------------|------------------------------------------------------------------------------|
| `withPayload`           | `ZodType?` | Schema to validate the message payload.                                      |
| `withProperties`        | `ZodType?` | Schema to validate custom properties.                                        |
| `withSystemProperties`  | `ZodType?` | Schema to validate system properties.                                        |
| `withEventData`         | `true?`    | Include Event Hub event data (offset, sequence number, enqueued time, etc.). |

### `EventHubMessageWrapper<PAYLOAD, PROPERTIES, SYSTEM_PROPERTIES, EVENT_DATA>`

The wrapper type provides typed access to message components:

```ts
message.payload           // PAYLOAD — validated message body
message.properties        // PROPERTIES — custom properties (if schema provided)
message.systemProperties  // SYSTEM_PROPERTIES — system properties (if schema provided)
message.eventData         // EventHubEventData — event metadata (if withEventData: true)
message.valid             // boolean — whether validation succeeded
```

## Startup Service

Register a startup hook that runs when the Azure Functions host starts:

```ts
import { IStartupService, STARTUP_SERVICE } from '@herrromich/az-functions';
import { injectable } from 'inversify';

@injectable()
export class MyStartupService implements IStartupService {
  async startup(): Promise<void> {
    // Run migrations, warm caches, etc.
  }
}
```

Register it in a container module:

```ts
import { ContainerModule } from 'inversify';
import { STARTUP_SERVICE } from '@herrromich/az-functions';
import { MyStartupService } from './startup.service';

export const StartupModule = new ContainerModule(({ bind }) => {
  bind(STARTUP_SERVICE).to(MyStartupService);
});
```

## Logging

The framework provides a structured logging system built on [Winston](https://github.com/winstonjs/winston).
It supports automatic logger naming, hierarchical log level configuration, per-invocation context metadata, and optional OpenTelemetry export.

### Basic Usage

Inject `LOGGER_FACTORY` and call it to create a logger scoped to your class:

```ts
import { inject } from 'inversify';
import { Logger, LOGGER_FACTORY, LoggerFactory } from '@herrromich/az-functions';

@injectable()
export class OrdersService {
  private readonly logger: Logger;

  constructor(@inject(LOGGER_FACTORY) loggerFactory: LoggerFactory) {
    this.logger = loggerFactory(); // auto-detects logger name from the call stack
  }

  doWork() {
    this.logger.info('Processing started.');
    this.logger.debug('Details:', { someContext: 'value' });
  }
}
```

You can also provide an explicit logger name:

```ts
this.logger = loggerFactory('my-app.orders.OrdersService');
```

### Log Levels

The following log levels are available, ordered from highest to lowest severity:

| Level     | Priority | Description            |
|-----------|----------|------------------------|
| `error`   | 0        | Error conditions       |
| `warn`    | 1        | Warning conditions     |
| `info`    | 2        | Informational messages |
| `http`    | 3        | HTTP request logging   |
| `verbose` | 4        | Verbose output         |
| `debug`   | 5        | Debug information      |
| `silly`   | 6        | Trace-level detail     |

### Logger Interface

The `Logger` type exposes a method for each log level.
Each method accepts a message and optional metadata:

```ts
logger.error('Operation failed', { orderId, error });
logger.warn('Retrying request', { attempt: 3 });
logger.info('Order created', { orderId });
logger.verbose('Cache hit', { key });
logger.debug('Query executed', { sql, params });
logger.silly('Entering method', { args });
```

### Default Log Level

Set the default log level for all loggers via `LoggerConfiguration`:

```ts
startPlatform({
  // ...
  loggerConfiguration: {
    defaultLogLevel: 'debug', // default is 'info' if omitted
  },
});
```

The default log level is set once at startup and applies to all loggers that don't have a specific level configured via `LogLevelProvider`.
It can be read from the container using the `DEFAULT_LOG_LEVEL` service identifier (e.g., for use in a `LogLevelProvider` constructor).

### Per-Logger Log Level Configuration

For fine-grained control, implement a `LogLevelProvider` and bind it to `LOG_LEVEL_PROVIDER`.
The provider receives the logger name and returns the applicable log level (or `undefined` to fall back to the default):

```ts
import { LogLevel, LogLevelProvider, LOG_LEVEL_PROVIDER } from '@herrromich/az-functions';
import { injectable } from 'inversify';

@injectable()
class MyLogLevelProvider implements LogLevelProvider {
  getLogLevel(loggerName?: string): LogLevel | undefined {
    if (loggerName?.startsWith('my-app.persistence')) {
      return 'error'; // suppress noisy persistence logs
    }
    if (loggerName?.startsWith('my-app.orders')) {
      return 'debug'; // verbose logging for orders module
    }
    return undefined; // use default log level
  }
}

export const LoggerModule = new ContainerModule(({ bind }) => {
  bind(LOG_LEVEL_PROVIDER).to(MyLogLevelProvider);
});
```

### Hierarchical Log Levels with `TrieSearchService`

For applications with many loggers, use the built-in `TrieSearchService` to configure log levels in a hierarchical, prefix-based manner.
Logger names separated by `.` are matched using a trie — the longest matching prefix wins:

```ts
import {
  DEFAULT_LOG_LEVEL,
  LogLevel,
  LogLevelProvider,
  LOG_LEVEL_PROVIDER,
  SYSTEM_LOGGER_NAME_PREFIX,
  TrieSearchService,
} from '@herrromich/az-functions';
import { inject, optional } from 'inversify';

export class TrieSearchLogLevelProvider extends TrieSearchService<LogLevel> implements LogLevelProvider {
  constructor(@inject(DEFAULT_LOG_LEVEL) @optional() defaultLogLevel: LogLevel) {
    super('.', defaultLogLevel); // '.' is the separator for hierarchical names
    this.set(SYSTEM_LOGGER_NAME_PREFIX, 'warn');       // platform internals: warn and above
    this.set('my-app.persistence.kysely', 'error');     // Kysely SQL logs: errors only
    this.set('my-app.orders', 'debug');                 // orders module: debug and above
  }

  getLogLevel(loggerName: string | undefined): LogLevel | undefined {
    return this.find(loggerName);
  }
}

export const LoggerModule = new ContainerModule(({ bind }) => {
  bind(TrieSearchLogLevelProvider).toSelf();
  bind(LOG_LEVEL_PROVIDER).toService(TrieSearchLogLevelProvider);
});
```

With this configuration:

- `my-app.orders.OrdersService` → `debug` (matches `my-app.orders` prefix)
- `my-app.orders.OrdersMapper` → `debug` (matches `my-app.orders` prefix)
- `my-app.persistence.kysely` → `error` (exact match)
- `my-app.persistence.repository` → default level (no specific prefix match)
- `#az-functions.http-controller` → `warn` (matches `#az-functions` prefix)

Since `TrieSearchService` has `set()`, `get()`, and `getAll()` methods, you can also **adjust log levels at runtime**.
For example, by exposing an HTTP endpoint (see the example project for a full `LogLevelsController` implementation).

### Automatic Logger Name Resolution

By default, `loggerFactory()` (called without arguments) uses `LOGGER_NAME_PROVIDER` to derive the logger name from the call stack.
Bind a custom `LOGGER_NAME_PROVIDER` to control how names are derived:

```ts
import { LOGGER_NAME_PROVIDER } from '@herrromich/az-functions';

export const LoggerModule = new ContainerModule(({ bind }) => {
  bind(LOGGER_NAME_PROVIDER).toFactory(() => {
    const regexp =
      /^\s*at\s+(?:new\s+)?([A-Za-z0-9_$]+)\s+\(.*src[\\/](.+)\/[^\\/]+:\d+:\d+\)$/;
    return (stackEntry?: string) => {
      const stackLines = stackEntry?.split('\n') ?? [];
      for (const line of stackLines) {
        const match = regexp.exec(line.trim());
        if (match) {
          return `my-app.${match[2]?.replace(/\//g, '.')}.${match[1]}`;
        }
      }
    };
  });
});
```

This produces logger names like `my-app.shared.orders.OrdersService` based on the file path and class name of the caller.

### Context Logger Metadata

Use `adjustContextLoggerMetadata` to attach metadata to all log messages within the current invocation context.
Metadata is configured **per log level**, so you can include detailed data only at lower severity levels to avoid noise:

```ts
import {
  adjustContextLoggerMetadata,
  PLATFORM_CONTEXT_MANAGER,
} from '@herrromich/az-functions';

// Attach metadata scoped to the current invocation context
adjustContextLoggerMetadata(contextManager, {
  error: {
    // included in error-level messages — full diagnostic data
    requestId,
    userId,
    requestBody,
  },
  warn: {
    // included in warn-level messages — moderate detail
    requestId,
    userId,
  },
  silly: {
    // included in silly-level messages — full trace data
    requestId,
    userId,
    requestBody,
    headers,
  },
});
```

The metadata is automatically merged with any existing context metadata.
It is included in all subsequent log messages at the corresponding level within the same invocation.

### `SYSTEM_LOGGER_NAME_PREFIX`

The constant `SYSTEM_LOGGER_NAME_PREFIX` (`'#az-functions'`) identifies loggers used internally by the platform.
Use it when configuring log levels to control the verbosity of framework-internal logging separately from your application:

```ts
this.set(SYSTEM_LOGGER_NAME_PREFIX, 'warn'); // only warnings and errors from the framework
```

When an internal (platform) class calls `loggerFactory()` without an explicit name, the name is auto-derived
from the call stack as `${SYSTEM_LOGGER_NAME_PREFIX}.<module-path>.<ClassName>`, where `<module-path>` mirrors
the source folder structure inside the package (with `/` replaced by `.`) and `<ClassName>` is the constructor,
class, or function that requested the logger.

Because logger names follow this hierarchical, dot-separated structure, you can use `TrieSearchService`
(see above) to target a whole subsystem with a single prefix, or a specific class with a fully qualified name.

The following internal logger names are currently produced by the platform:

| Logger Name                                                              | Module / Component                                     |
|--------------------------------------------------------------------------|--------------------------------------------------------|
| `#az-functions.platform.AzurePlatform`                                   | Core platform bootstrap / trigger wiring               |
| `#az-functions.http-controller.HttpOperationsRegistrationService`        | HTTP operation registration with the Functions host    |
| `#az-functions.http-controller.HttpHandlerFactory`                       | HTTP trigger handler creation                          |
| `#az-functions.http-controller.OpenApiRegistrationService`               | OpenAPI route/document registration                    |
| `#az-functions.http-controller.OpenApiDefinitionService`                 | OpenAPI definition generation                          |
| `#az-functions.http-controller.OpenApiPrintService`                      | OpenAPI print (`PLATFORM_MODE=print-open-api`) mode    |
| `#az-functions.http-controller.security.AuthenticatorProvider`           | HTTP authenticator resolution                          |
| `#az-functions.http-controller.security.OperationAuthenticationResolver` | Per-operation authentication resolution                |
| `#az-functions.event-hub-handler.EventHubTriggersRegistrationService`    | Event Hub trigger registration with the Functions host |
| `#az-functions.event-hub-handler.EventHubHandlerFactory`                 | Event Hub trigger handler creation                     |

> [!NOTE]
> This list reflects the classes that currently request a logger via `loggerFactory()` without an explicit
> name. It may grow as the framework evolves — inspect the resolved logger name via your own `LogLevelProvider`
> or log output if you need to confirm the exact name for your installed version.

### OpenTelemetry / Application Insights

Pass `otelConfiguration` in `loggerConfiguration` to export logs and traces to Application Insights:

```ts
startPlatform({
  // ...
  loggerConfiguration: {
    otelConfiguration: {
      applicationInsightsConnectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
      serviceName: 'my-service',
      serviceVersion: '1.0.0',
    },
  },
});
```

If no `otelConfiguration` is provided, the framework falls back to the built-in Azure Functions `InvocationContext` logger.

## OpenAPI Generation

If the application can be built, generate the OpenAPI specification in a special mode:

```bash
PLATFORM_MODE=print-open-api node dist/index.js
```

This outputs the OpenAPI JSON and YAML files for each registered REST application without starting the Azure Functions host.

| Environment Variable  | Default                     | Description                                                                                            |
|-----------------------|-----------------------------|--------------------------------------------------------------------------------------------------------|
| `PLATFORM_MODE`       | `start`                     | Set to `print-open-api` to generate OpenAPI definitions instead of starting the host.                  |
| `OPEN_API_PRINT_PATH` | `dist/open-api-definitions` | Directory where generated `.json` and `.yaml` files are written. Resolved relative to `process.cwd()`. |

Example with a custom output path:

```bash
PLATFORM_MODE=print-open-api OPEN_API_PRINT_PATH=./docs/api node dist/index.js
```

## Registering Unsupported Azure Functions Triggers

For trigger types not yet supported by decorators (e.g., Cosmos DB, Timer), use the Azure Functions SDK directly.
To benefit from the platform's structured logging and context propagation, retrieve the `PlatformContextManager` and `PlatformContextProvider` from the platform container and wrap your handler execution:

```ts
import { app, InvocationContext } from '@azure/functions';
import {
  Logger,
  LOGGER_FACTORY,
  LoggerFactory,
  PLATFORM_CONTEXT_MANAGER,
  PLATFORM_CONTEXT_PROVIDER,
  startPlatform,
} from '@herrromich/az-functions';

// startPlatform returns the platform container
const platformContainer = startPlatform({ /* ... */ });

const contextManager = platformContainer.get(PLATFORM_CONTEXT_MANAGER);
const contextProvider = platformContainer.get(PLATFORM_CONTEXT_PROVIDER);
const loggerFactory = platformContainer.get(LOGGER_FACTORY);
const logger: Logger = loggerFactory('cosmosdb-handler');

app.cosmosDB('cosmosDbTrigger', {
  connection: 'CosmosDBConnection',
  containerName: 'my-container',
  databaseName: 'my-database',
  handler: async (documents: unknown[], context: InvocationContext) => {
    // Wrap execution in the platform context for structured logging
    return contextManager.runWith(
      contextProvider.providePlatformContext(context),
      async () => {
        logger.info(`Received ${documents.length} documents from Cosmos DB`);
        logger.debug('Processing documents', { documents });
        // ... handle documents
      },
    );
  },
});
```

**Key services available from the platform container:**

| Service Identifier          | Type                      | Description                                                                                             |
|-----------------------------|---------------------------|---------------------------------------------------------------------------------------------------------|
| `PLATFORM_CONTEXT_MANAGER`  | `PlatformContextManager`  | Manages the async context. Use `runWith()` to scope logging and context values to a handler invocation. |
| `PLATFORM_CONTEXT_PROVIDER` | `PlatformContextProvider` | Creates a `PlatformContext` from an `InvocationContext`.                                                |
| `LOGGER_FACTORY`            | `LoggerFactory`           | Creates scoped `Logger` instances with structured logging support.                                      |

Without wrapping in `contextManager.runWith()`, the logger will still work but won't have access to the invocation context (e.g., invocation ID, trigger metadata) for log correlation.

## License

MIT
