import { HttpRequest } from '@azure/functions';
import { decorate, injectable } from 'inversify';
import * as shared from 'shared';
import { adjustMetadata, AZURE_FUNCTION_METADATA_KEY } from 'shared';
import { ZodType } from 'zod';
import {
  ControllerConfig,
  ControllerMetadata,
  ControllerOperationArgsMetadata,
  ControllerOperationBaseMetadata,
  ControllerOperationCommonArgMetadata,
  ControllerOperationConfig,
  ControllerOperationMetadata,
  ControllerRequest,
  ControllerRequestBodyOperationConfig,
  HTTP_OPERATION_METADATA_KEY,
  OperationArgMetadata,
  PathSchema,
  QueryItemSchema,
} from './decorators.model';

/**
 * Class decorator to define an HTTP controller.
 *
 * @param config
 * @returns Class decorator function
 *
 * @example
 * ```typescript
 * @httpController({ path: '/items' })
 * export class MyController {
 *   @httpGet({ description: 'Get all items',
 *     responses: {
 *       200: {
 *         description: 'Successful response',
 *         schema: z.array(z.object({ id: z.string(), name: z.string() }))
 *       }
 *     }
 *   })
 *   async getItems(@httpRequest() req: HttpRequest): Promise<{ id: string; name: string }[]> {
 *     // Handle GET /api/items
 *   }
 *
 *   @httpPost({
 *     path: '/items',
 *     description: 'Create a new item',
 *     responses: {
 *       201: {
 *         description: 'Item created'
 *       }
 *     }
 *   })
 *   async createItem(@httpBody({ schema: z.object({ name: z.string() }) }) body: { name: string }): Promise<void> {
 *     // Handle POST /api/items
 *   }
 * }
 * ```
 */
export function httpController(config: ControllerConfig): ClassDecorator {
  return target => {
    const metadata: ControllerMetadata = {
      type: 'http-controller',
      ...config,
    };
    Reflect.defineMetadata(AZURE_FUNCTION_METADATA_KEY, metadata, target);
    decorate(injectable(), target);
  };
}

/**
 * Method decorator to define an HTTP GET operation.
 *
 * @param operationConfig
 * @return Method decorator function
 *
 * @example
 * ```typescript
 * @httpController({ path: '/items' })
 * class MyController {
 *   @httpGet({
 *     path: '/{id}',
 *     description: 'Get item by ID',
 *     responses: {
 *       200: {
 *         description: 'Successful response',
 *         schema: z.object({ id: z.string(), name: z.string() })
 *       }
 *     }
 *   })
 *   async getItemById(@httpPathParam({ name: 'id', schema: z.string().uuid() }) id: string): Promise<{ id: string; name: string }> {
 *     // Handle GET /item/{id}
 *     return { id, name: 'Sample Item' };
 *   }
 * }
 * ```
 */
export function httpGet(operationConfig?: ControllerOperationConfig): MethodDecorator {
  return provideControllerOperationDecorator({ method: 'get', ...operationConfig });
}

/**
 * Method decorator to define an HTTP HEAD operation.
 *
 * @param operationConfig
 * @return Method decorator function
 */
export function httpHead(operationConfig?: ControllerOperationConfig): MethodDecorator {
  return provideControllerOperationDecorator({ method: 'head', ...operationConfig });
}

/**
 * Method decorator to define an HTTP DELETE operation.
 *
 * @param operationConfig
 * @return Method decorator function
 *
 * @example
 * ```typescript
 * @httpController({ path: '/items' })
 * class MyController {
 *   @httpDelete({
 *     path: '/{id}',
 *     description: 'Delete item by ID',
 *     responses: {
 *       204: {
 *         description: 'Item deleted'
 *       }
 *     }
 *   })
 *   async deleteItemById(@httpPathParam({ name: 'id', schema: z.string().uuid() }) id: string): Promise<void> {
 *     // Handle DELETE /item/{id}
 *   }
 * }
 *   ```
 */
export function httpDelete(operationConfig?: ControllerOperationConfig): MethodDecorator {
  return provideControllerOperationDecorator({ method: 'delete', ...operationConfig });
}

/**
 * Method decorator to define an HTTP POST operation.
 * @param operationConfig
 * @return Method decorator function
 *
 * @example
 * ```typescript
 * @httpController({ path: '/items' })
 * class MyController {
 *   @httpPost({
 *     description: 'Create a new item',
 *     responses: {
 *       201: {
 *         description: 'Item created'
 *       }
 *     }
 *   })
 *   async createItem(@httpBody({ schema: z.object({ name: z.string() }) }) body: { name: string }): Promise<void> {
 *     // Handle POST /items
 *   }
 * }
 * ```
 */
export function httpPost(operationConfig?: ControllerRequestBodyOperationConfig): MethodDecorator {
  return provideControllerOperationDecorator({ method: 'post', ...operationConfig });
}

/**
 * Method decorator to define an HTTP PUT operation.
 *
 * @param operationConfig
 * @return Method decorator function
 *
 * @example
 * ```typescript
 * @httpController({ path: '/items' })
 * class MyController {
 *   @httpPut({
 *     path: '/{id}',
 *     description: 'Update item by ID',
 *     responses: {
 *       204: {
 *         description: 'Item updated'
 *         }
 *     }
 *   })
 *   async updateItemById(
 *     @httpPathParam({ name: 'id', schema: z.string().uuid() }) id: string,
 *     @httpBody({ schema: z.object({ name: z.string() }) }) body: { name: string }
 *   ): Promise<void> {
 *     // Handle PUT /item/{id}
 *   }
 * }
 * ```
 */

export function httpPut(operationConfig?: ControllerRequestBodyOperationConfig): MethodDecorator {
  return provideControllerOperationDecorator({ method: 'put', ...operationConfig });
}

/**
 * Method decorator to define an HTTP PATCH operation.
 *
 * @param operationConfig
 * @return Method decorator function
 *
 * @example
 * ```typescript
 * @httpController({ path: '/items' })
 * class MyController {
 *   @httpPatch({
 *     path: '/{id}',
 *     description: 'Partially update item by ID',
 *     responses: {
 *       204: {
 *         description: 'Item updated'
 *       }
 *     }
 *   })
 *   async partiallyUpdateItemById(
 *     @httpPathParam({ name: 'id', schema: z.string().uuid() }) id: string,
 *     @httpBody({ schema: z.object({ name: z.string().optional() }) }) body: { name?: string }
 *   ): Promise<void> {
 *     // Handle PATCH /item/{id}
 *   }
 * }
 * ```
 */
export function httpPatch(operationConfig?: ControllerRequestBodyOperationConfig): MethodDecorator {
  return provideControllerOperationDecorator({ method: 'patch', ...operationConfig });
}

function provideControllerOperationDecorator(baseMetadata: ControllerOperationBaseMetadata): MethodDecorator {
  return (target, propertyKey) => {
    const ownMetadata = Reflect.getOwnMetadata(HTTP_OPERATION_METADATA_KEY, target, propertyKey);
    const argsMetadata = (ownMetadata ??
      shared.initializeMetadata(target, propertyKey, getCommonArg)) as ControllerOperationArgsMetadata;
    const metadata: ControllerOperationMetadata = {
      ...baseMetadata,
      ...argsMetadata,
    };
    Reflect.defineMetadata(HTTP_OPERATION_METADATA_KEY, metadata, target, propertyKey);
  };
}

/**
 * Parameter decorator to define the HTTP request body.
 *
 * @param bodyConfig
 * @returns Parameter decorator function
 *
 * @example
 * ```typescript
 * @httpController({ path: '/items' })
 * class MyController {
 *   @httpPost({
 *     description: 'Create a new item',
 *     responses: {
 *       201: {
 *         description: 'Item created'
 *       }
 *     }
 *   })
 *   async createItem(@httpBody({ schema: z.object({ name: z.string() }) }) body: { name: string }): Promise<void> {
 *     // Handle POST /items
 *   }
 * }
 * ```
 */
export function httpBody(bodyConfig: ControllerRequest): ParameterDecorator {
  return adjustOperationMetadata({
    type: 'body',
    ...bodyConfig,
  });
}

/**
 * Configuration for the `@httpPathParam` decorator.
 *
 * @property name - The name of the path parameter as defined in the route.
 * @property schema - Optional Zod schema to validate the path parameter.
 *
 * @example
 * ```typescript
 * @httpController({ path: '/items' })
 * class MyController {
 *   @httpGet({
 *     path: '/{id}',
 *     description: 'Get item by ID',
 *     responses: {
 *       200: {
 *         description: 'Successful response',
 *         schema: z.object({ id: z.string(), name: z.string() })
 *       }
 *     }
 *   })
 *   async getItemById(@httpPathParam({ name: 'id', schema: z.string().uuid() }) id: string): Promise<{ id: string; name: string }> {
 *     // Handle GET /item/{id}
 *     return { id, name: 'Sample Item' };
 *   }
 * }
 * ```
 */
export interface PathParamConfig {
  name: string;
  schema?: PathSchema;
}

/**
 * Parameter decorator to define an HTTP path parameter.
 *
 * @param config
 * @returns Parameter decorator function
 *
 * @example
 * ```typescript
 * @httpController({ path: '/items' })
 * class MyController {
 *   @httpGet({
 *     path: '/{id}',
 *     description: 'Get item by ID',
 *     responses: {
 *       200: {
 *         description: 'Successful response',
 *         schema: z.object({ id: z.string(), name: z.string() })
 *       }
 *     }
 *   })
 *   async getItemById(@httpPathParam({ name: 'id', schema: z.string().uuid() }) id: string): Promise<{ id: string; name: string }> {
 *     // Handle GET /item/{id}
 *     return { id, name: 'Sample Item' };
 *   }
 * }
 * ```
 */
export function httpPathParam(config: PathParamConfig): ParameterDecorator {
  return adjustOperationMetadata({
    type: 'path',
    ...config,
  });
}

/**
 * Configuration for the `@httpQueryParam` decorator.
 *
 * @property name - The name of the query parameter.
 * @property schema - Optional schema to validate the query parameter.
 *
 * @example
 * ```typescript
 * @httpController({ path: '/items' })
 * class MyController {
 *   @httpGet({
 *     description: 'Search items',
 *     responses: {
 *       200: {
 *         description: 'Successful response',
 *         schema: z.array(z.object({ id: z.string(), name: z.string() }))
 *       }
 *     }
 *   })
 *   async searchItems(@httpQueryParam({ name: 'query', schema: z.string().min(3) }) query: string): Promise<{ id: string; name: string }[]> {
 *     // Handle GET /items?query=searchTerm
 *     return [{ id: '1', name: 'Sample Item' }];
 *   }
 * }
 * ```
 */
export interface QueryParamConfig {
  name: string;
  schema?: QueryItemSchema;
}

/**
 * Parameter decorator to define an HTTP query parameter.
 *
 * @param config
 * @returns Parameter decorator function
 *
 * @example
 * ```typescript
 * @httpController({ path: '/items' })
 * class MyController {
 *   @httpGet({
 *     description: 'Search items',
 *     responses: {
 *       200: {
 *         description: 'Successful response',
 *         schema: z.array(z.object({ id: z.string(), name: z.string() }))
 *       }
 *     }
 *   })
 *   async searchItems(@httpQueryParam({ name: 'query', schema: z.string().min(3) }) query: string): Promise<{ id: string; name: string }[]> {
 *     // Handle GET /items?query=searchTerm
 *     return [{ id: '1', name: 'Sample Item' }];
 *   }
 * }
 * ```
 */
export function httpQueryParam(config: QueryParamConfig): ParameterDecorator {
  return adjustOperationMetadata({
    type: 'query',
    ...config,
  });
}

/**
 * Configuration for the `@httpHeaderParam` decorator.
 *
 * @property name - The name of the header parameter.
 * @property schema - Optional Zod schema to validate the header parameter.
 *
 * @example
 * ```typescript
 * @httpController({ path: '/items' })
 * class MyController {
 *   @httpGet({
 *     description: 'Get items with custom header',
 *     responses: {
 *       200: {
 *         description: 'Successful response',
 *         schema: z.array(z.object({ id: z.string(), name: z.string() }))
 *       }
 *     }
 *   })
 *   async getItems(@httpHeaderParam({ name: 'X-Custom-Header', schema: z.string().optional() }) customHeader: string | undefined): Promise<{ id: string; name: string }[]> {
 *     // Handle GET /items with custom header
 *     return [{ id: '1', name: 'Sample Item' }];
 *   }
 * }
 * ```
 */
export interface HeaderParamConfig {
  name: string;
  schema?: ZodType<string | undefined>;
}

/**
 * Parameter decorator to define an HTTP header parameter.
 *
 * @param config
 * @returns Parameter decorator function
 *
 * @example
 * ```typescript
 * @httpController({ path: '/items' })
 * class MyController {
 *   @httpGet({
 *     description: 'Get items with custom header',
 *     responses: {
 *       200: {
 *         description: 'Successful response',
 *         schema: z.array(z.object({ id: z.string(), name: z.string() }))
 *       }
 *     }
 *   })
 *   async getItems(@httpHeaderParam({ name: 'X-Custom-Header', schema: z.string().optional() }) customHeader: string | undefined): Promise<{ id: string; name: string }[]> {
 *     // Handle GET /items with custom header
 *     return [{ id: '1', name: 'Sample Item' }];
 *   }
 * }
 * ```
 */
export function httpHeaderParam(config: HeaderParamConfig): ParameterDecorator {
  return adjustOperationMetadata({
    type: 'header',
    ...config,
  });
}

/**
 * Parameter decorator to inject the full HTTP request object.
 *
 * @returns Parameter decorator function
 *
 * @example
 * ```typescript
 * @httpController({ path: '/items' })
 * class MyController {
 *   @httpGet({
 *     description: 'Get all items',
 *     responses: {
 *       200: {
 *         description: 'Successful response',
 *         schema: z.array(z.object({ id: z.string(), name: z.string() }))
 *       }
 *     }
 *   })
 *   async getItems(@httpRequest() req: HttpRequest): Promise<{ id: string; name: string }[]> {
 *     // Handle GET /api/items
 *     return [{ id: '1', name: 'Sample Item' }];
 *   }
 * }
 * ```
 */
export function httpRequest(): ParameterDecorator {
  return adjustOperationMetadata({
    type: 'request',
  });
}

/**
 * Parameter decorator to inject the authenticated user account.
 * @returns Parameter decorator function
 *
 * @example
 * ```typescript
 * @httpController({ path: '/items' })
 * class MyController {
 *   @httpGet({
 *     description: 'Get all items',
 *     responses: {
 *       200: {
 *         description: 'Successful response',
 *         schema: z.array(z.object({ id: z.string(), name: z.string() }))
 *       }
 *     }
 *   })
 *   async getItems(@user() userAccount: UserAccount): Promise<{ id: string; name: string }[]> {
 *     this.logger.info(`Fetching profile for user ID: ${userAccount.id}`);
 *     // Handle GET /api/items
 *     return [{ id: '1', name: 'Sample Item' }];
 *   }
 * }
 * ```
 */
export function user(): ParameterDecorator {
  return adjustOperationMetadata({
    type: 'user',
  });
}

function adjustOperationMetadata(operationArg: OperationArgMetadata): ParameterDecorator {
  return adjustMetadata(HTTP_OPERATION_METADATA_KEY, operationArg, getCommonArg);
}

function getCommonArg(paramType: unknown): ControllerOperationCommonArgMetadata {
  if (paramType === HttpRequest) {
    return { type: 'request' };
  } else {
    return shared.getCommonArg(paramType);
  }
}
