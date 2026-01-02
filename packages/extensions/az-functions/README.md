# az-functions
**az-functions** extension for Azure Functions in Node.js

[![npm version](https://badge.fury.io/js/%40herrromich%2Faz-functions.svg)](https://badge.fury.io/js/%40herrromich%2Faz-functions) [![npm downloads](https://img.shields.io/npm/dm/%40herrromich%2Faz-functions.svg)](https://www.npmjs.com/package/@herrromich/az-functions) [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

# Overview
**az-functions** extends the Azure Functions programming model for Node.js (v4) by introducing a powerful structure for building scalable and maintainable serverless applications. It integrates several key concepts:

 * **Inversion of Control (IoC) Container:** Using InversifyJS, a lightweight and flexible IoC container, to manage dependencies and ensure proper decoupling of components.
 * **TypeScript Decorators:** Making use of TypeScript decorators to declaratively define Azure Function components and services.
 * **Input Validation:** Integrating the Zod validation library to ensure that all inputs (e.g., HTTP request bodies, Message Broker messages) are properly validated before processing.
 * **OpenAPI Code-First Definition Generation:** Automatically generating OpenAPI (Swagger) definitions based on the Azure Function code, following the code-first approach.

This package aims to provide a more structured approach to Azure Functions development, focusing on best practices such as dependency injection, separation of concerns, and input validation.

# Installation
```bash
npm install @herrromich/az-functions inversify reflect-metadata zod @asteasolutions/zod-to-openapi winston
```
```bash
yarn add @herrromich/az-functions inversify reflect-metadata zod @asteasolutions/zod-to-openapi winston
```
```bash
pnpm add @herrromich/az-functions inversify reflect-metadata zod @asteasolutions/zod-to-openapi winston
```
> Packages zod  and @asteasolutions/zod-to-openapi are optional

**az-functions** introduces a bunch of decorators to define components behaviour. Typescript should be configured accordingly:
```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```
# Usage
## Step 1. Initialize reflect-metadata and optionally ZOD for OpenAPI
```typescript
// src/init.ts
import 'reflect-metadata';

import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

```

## Step 2. Declare startPlatform IoC container
A project-wide IoC container will be used to start **az-functions** startPlatform and register components.

```typescript
// src/startPlatform-container.ts
import { Container } from 'inversify';

export const platformContainer = new Container({
  defaultScope: 'Singleton',
});

```

## Step 3. Register components
There are a number of currently supported **Azure functions triggers** that could be defined over decorators.
The components could be either directly registered in the *platformContainer*. In this case the module should be imported before start of startPlatform.
```typescript
// src/message-handlers/index.ts
import { platformContainer } from './startPlatform-container';
import { DeviceCommandHandler } from './device.handlers';

// Registering of handlers
platformContainer.bind(AZURE_FUNCTION).to(DeviceCommandHandler);
```

Or they could be registered in **InversifyJS** module and loaded before startPlatform starts.
This is the preferred way, when there are many components to register.
```typescript
// src/message-handlers/index.ts
import { ContainerModule } from 'inversify';
import { AZURE_FUNCTION } from '@herrromich/az-functions';
import { DeviceCommandHandler } from './device-command.handlers';

// Registering of handlers
export const deviceHandlersModule = new ContainerModule(loadOptions => {
  loadOptions.bind(AZURE_FUNCTION).to(DeviceCommandHandler);
});
```

## Step 4. Start startPlatform
```typescript
// src/index.ts
import './init';

import { startPlatform } from '@herrromich/az-functions';
import { platformContainer } from './startPlatform-container';
import { deviceHandlersModule } from ',/message-handlers';

platformContainer.load(deviceHandlersModule);

await startPlatform(platformContainer);

```
> [!WARNING] **Important!** If you use a bundler like **webpack** import initialization on top of your module.

# Supported Azure Functions trigger types
## Startup Hook
A startup hook registers a handler that will be executed on Azure functions startup.

### Definition of Startup Service
A startup service should implement **StartupService** interface.

```typescript
// src/shared/startup.ts

import {StartupService} from '@herrromich/az-functions';
import {injectable} from 'inversify';
import {STARTUP_SERVICE} from "./startup.service";

@injectable()
export class AzStartupService implements StartupService {
  async startup(): Promise<void> {
    // migration
  }
}
````

### Registration of Startup Service
Startup service should be registered in IoC container with **STARTUP_SERVICE** service identifier.

```typescript
// src/shared/index.ts
import { ContainerModule } from 'inversify';
import { STARTUP_SERVICE } from '@herrromich/az-functions';
import { AzStartupService } from './startup';

// Registering of handlers
export const startupModule = new ContainerModule(loadOptions => {
  loadOptions.bind(STARTUP_SERVICE).to(AzStartupService);
});
```

## HTTP Trigger
### OpenAPI definition of REST Interface (optional)
Optionally, REST interface could be defined with OpenAPI definition.
If it is not defined, the startPlatform will generate a default OpenAPI definition with available endpoints.

```typescript
// src/apis/users-management/users-management.application.ts
import { RestApplication, REST_APPLICATION } from '@herrromich/az-functions';
import { platformContainer } from "src/startPlatform-container";

export const USERS_MANAGEMENT_API = 'users-management';
export const USERS_MANAGEMENT_APPLICATION: RestApplication = {
  name: USERS_MANAGEMENT_API,
  context: 'users-management',
  openApiConfig: {
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'Users Management API',
    },
    tags: [
      {
        name: 'Users',
        description: 'CRUD operations for users .',
      },
    ],
  },
};
```

### Definition of REST Controller

```typescript
// src/apis/users-management/users-management.controller.ts
import { controller, get, Logger } from '@herrromich/az-functions';
import { USERS_MANAGEMENT_API } from './users-management.application';
import { z } from 'zod';

export const userDtoSchema = z
  .object({
    id: z.string().uuid(),
    displayName: z.string(),
    givenName: z.string(),
    surname: z.string(),
    username: z.string(),
  })
  .openapi('User');

export type UserDto = z.infer<typeof userDtoSchema>;

export const usersResponseDtoSchema = z
  .object({
    items: z.array(userDtoSchema),
  })
  .openapi('UsersResponse');

export type UsersResponseDto = z.infer<typeof usersResponseDtoSchema>;

@controller({
  application: USERS_MANAGEMENT_API,
  path: 'users',
  tags: ['Users'],
})
export class UsersController {
  constructor(
    private readonly logger: Logger,
    private readonly usersService: UsersService,
    private readonly usersMapper: UsersMapper
  ) {}

  @get({
    response: {
      schema: usersResponseDtoSchema,
      description: 'Returns a list of users',
    },
  })
  async getUsers(): Promise<UsersResponseDto> {
    this.logger.info('Requesting users.');
    const users = await this.usersService.getUsers();
    const items = this.usersMapper.fromAdUsers(adUsers);
    this.logger.info('Responding users.');
    this.logger.debug('Responding %n users.', items.length);
    return { items };
  }
}
```

### Registration of REST Application and Controller
```typescript
// src/apis/users-management/index.ts
import { ContainerModule } from 'inversify';
import { AZURE_FUNCTION } from '@herrromich/az-functions';
import { UsersController } from './users-management.controller';
import { USERS_MANAGEMENT_APPLICATION } from './users-management.application';

// Registering of handlers
export const usersManagementModule = new ContainerModule(loadOptions => {
  loadOptions.bind(REST_APPLICATION).toConstantValue(USERS_MANAGEMENT_APPLICATION);
  loadOptions.bind(AZURE_FUNCTION).to(UsersController);
});
```

## Event-Hub Trigger
### Definition of EventHub Handler

```typescript
// src/message-handlers/device.handler.ts
import { z } from 'zod';
import { telemetrySchema } from './telemetry.model';
import {
  AZURE_FUNCTION,
  eventHubHandler,
  EventHubHandler, 
  EventHubMessageWrapper, 
  message, 
  Logger
} from '@herrromich/az-functions';
import { InvocationContext } from "@azure/functions";
import { platformContainer } from "/src/startPlatform-container";

const deviceMessagePayloadSchema = z
  .object({
    telemetry: telemetrySchema,
  });
type DeviceMessagePayload = z.infer<typeof deviceMessagePayloadSchema>;

const devicePropertiesSchema = z
  .object({
    deviceId: z.string(),
    deviceSerialNumber: z.string(),
  });
type DeviceProperties = z.infer<typeof devicePropertiesSchema>;

@eventHubHandler({
  triggerId: 'handleDeviceTelemetry',
  connection: 'eventhub',
  eventHubName: 'telemetry',
  consumerGroup: 'handlerTelemetry',
  cardinality: 'many',
})
export class DeviceCommandHandler implements EventHubHandler {
  constructor(private readonly logger: Logger) {
  }

  async handle(
    context: InvocationContext,
    @messages({
      withPayload: deviceMessageSchema,
      withProperties: devicePropertiesSchema,
      withEventData: true
    })
    messages: EventHubMessageWrapper<DeviceMessagePayload, DeviceProperties, undefined, true>[]
  ): Promise<void> {
    this.logger.info(`Processing telemetry bundle`);
    for (const message of messages) {
      this.logger.info(`Telemetry, enqued at ${message.eventData.enqueuedTimeUtc} from device ${message.properties.deviceId} (${message.properties.deviceSerialNumber}) with payload ${JSON.stringify(message.payload)}`);
    }
  }
}
```

### Registration of EventHub Handler
```typescript
// src/message-handlers/index.ts
import { ContainerModule } from 'inversify';
import { AZURE_FUNCTION } from '@herrromich/az-functions';
import { DeviceCommandHandler } from './device-command.handler';

// Registering of handlers
export const deviceHandlersModule = new ContainerModule(loadOptions => {
  loadOptions.bind(AZURE_FUNCTION).to(DeviceCommandHandler);
});
```

# Generation of OpenAPI definition
If the **Azure Functions** application can be built, it is possible to start it in an **OpenAPI** Generation displayMode.
```bash
PLATFORM_MODE=print-open-api node dist/index.js
```

# Registration of Unsupported Azure Functions Trigger
```typescript
// src/cosmos-handlers/index.ts

import { app } from '@azure/functions';
import { PLATFORM_MODE, PlatformMode } from '@herrromich/az-functions';
import { platformContainer } from './startPlatform-container';

// It should be checked, that startPlatform runs in operating displayMode
if (platformContainer.get<PlatformMode>(PLATFORM_MODE) === 'start') {
  app.cosmosDB('cosmosDbTrigger', {
    connection: 'connection',
    containerName: 'app-container',
    databaseName: 'users-management',
    collectionName: 'users',
    handler: async (documents, context) => {},
  });
}
```