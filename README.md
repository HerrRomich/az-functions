# az-functions
**az-functions**  extends the Azure Functions programming model for Node.js (v4) by introducing a powerful structure for building scalable and maintainable serverless applications. It integrates several key concepts:

 * **Inversion of Control (IoC) Container:** Using InversifyJS, a lightweight and flexible IoC container, to manage dependencies and ensure proper decoupling of components.
 * **TypeScript Decorators:** Making use of TypeScript decorators to declaratively define Azure Function components and services.
 * **Input Validation:** Integrating the Zod validation library to ensure that all inputs (e.g., HTTP request bodies, Message Broker messages) are properly validated before processing.
 * **OpenAPI Code-First Definition Generation:** Automatically generating OpenAPI (Swagger) definitions based on the Azure Function code, following the code-first approach.

This package aims to provide a more structured approach to Azure Functions development, focusing on best practices such as dependency injection, separation of concerns, and input validation.

# Installation
```bash
npm install @@herrromich/az-functions inversify reflect-metadata zod @asteasolutions/zod-to-openapi --save
```
```bash
yarn add @@herrromich/az-functions inversify reflect-metadata zod @asteasolutions/zod-to-openapi
```
```bash
pnpm add @@herrromich/az-functions inversify reflect-metadata zod @asteasolutions/zod-to-openapi
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

## Step 2. Declare platform IoC container
A project-wide IoC container will be used to start **az-functions** platform and register components.

```typescript
// src/platform-container.ts
import { Container } from 'inversify';

export const platformContainer = new Container({
  defaultScope: 'Singleton',
  skipBaseClassChecks: true,
});

```

## Step 3. Register components
There are a number of currently supported **Azure functions triggers** that could be defined over decorators.
The components could be either directly registered in the *platformContainer*. In this case the module should be imported before start of platform.
```typescript
// src/message-handlers/index.ts
import { platformContainer } from './platform-container';
import { DeviceCommandHandler } from './device.handlers';

// Registering of handlers
platformContainer.bind(AZURE_FUNCTION).to(DeviceHandlers);
```

Or they could be registered in **InversifyJS** module and loaded before platform starts.
```typescript
// src/message-handlers/index.ts
import { ContainerModule } from 'inversify';
import { AZURE_FUNCTION } from '@herrromich/az-functions';
import { DeviceCommandHandler } from './device-command.handlers';

// Registering of handlers
export const deviceHandlersModule = new ContainerModule((bind) => {
  bind(AZURE_FUNCTION).to(DeviceCommandHandler);
});
```

## Step 4. Start platform
```typescript
// src/index.ts
import './init';

import { platform } from '@herrromich/az-functions';
import { platformContainer } from './platform-container';
import { deviceHandlersModule } from 'src/message-handlers';

platformContainer.load(deviceHandlersModule);

await platform(platformContainer);

```
> :warning: **Important!** If you use a bundler like **webpack** import initialization on top of your module.

# Supported Azure Functions trigger types
## Startup Hook
```typescript
// src/shared/startup.ts

import { StartupService } from '@herrromich/az-functions';
import { injectable } from 'inversify';

@injectable()
export class AzStartupService implements StartupService {
  async startup(): Promise<void> {
    // migration
  }
}

// Registering of handlers
platformContainer.bind(STARTUP_SERVICE).to(AzStartupService);
```

## HTTP Trigger
```typescript
// src/apis/users-management/users-management.application.ts
import { RestApplication } from '@herrromich/az-functions';
import { platformContainer } from "src/platform-container";

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

// API registration
platformContainer.bind<RestApplication>(REST_APPLICATION).toConstantValue(USERS_MANAGEMENT_APPLICATION);
```
```typescript
// src/apis/users-management/users-management.controller.ts
import { Controller, Get, Logger } from '@@herrromich/az-functions';
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

@Controller({
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

  @Get({
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

// Registering of controller
platformContainer.bind(AZURE_FUNCTION).to(UsersController);
```

## Event-Hub Trigger
```typescript
// src/message-handlers/device.handlers.ts
import { z } from 'zod';
import { telemetrySchema } from './telemetry.model';
import {
  AZURE_FUNCTION, 
  EventHubHandlers, 
  EventHubMessageWrapper, 
  Handler, 
  Message, 
  Logger
} from '@herrromich/az-functions';
import { InvocationContext } from "@azure/functions";
import { platformContainer } from "src/platform-container";

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

@EventHubHandlers({
  connection: 'eventhub',
  eventHubName: 'telemetry',
})
export class DeviceHandlers {
  constructor(private readonly logger: Logger) {
  }

  @Handler({
    triggerId: 'handleDeviceTelemetry',
    cardinality: 'many',
    consumerGroup: 'handlerTelemetry',
  })
  async handleDeviceTelemetry(
    context: InvocationContext,
    @Message({
      withPayload: deviceMessageSchema,
      withProperties: devicePropertiesSchema,
      withEventData: true
    })
    messages: EventHubMessageWrapper<DeviceMessagePayload, DeviceProperties, undefined, true>[]
  ): Promise<void> {
    this.logger.info(`Processing telemetry bundle`);
    for (const message of messages) {
      this.logger.info(`Telemetry, enqued at ${message.eventData.enqueuedTimeUtc} is processing.`);
    }
  }
}

// Registering of handlers
platformContainer.bind(AZURE_FUNCTION).to(DeviceHandlers);
```

# Generation of OpenAPI definition
If the **Azure Functions** application can be built, it is possible to start it in an **OpenAPI** Generation mode.
```bash
PLATFORM_MODE=print-open-api node dist/index.js
```

# Registration of Unsupported Azure Functions Trigger
```typescript
import { app } from '@azure/functions';
import { PLATFORM_MODE, PlatformMode } from '@@herrromich/az-functions';
import { platformContainer } from './platform-container';

// It should be checked, that platform runs in operating mode
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