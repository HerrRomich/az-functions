import { decorate, injectable } from 'inversify';
import * as shared from 'shared';
import { adjustMetadata, FUNCTION_HANDLER_METADATA } from 'shared';
import { ZodType } from 'zod';
import {
  ControllerConfig,
  ControllerOperationArgMetadata,
  ControllerOperationArgsMetadata,
  ControllerOperationBaseMetadata,
  ControllerOperationCommonArgMetadata,
  ControllerOperationConfig,
  ControllerOperationMetadata,
  ControllerRequest,
  ControllerRequestBodyOperationConfig,
  HttpControllerMetadata,
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
 * ```ts
 * const ItemSchema = z.object({
 *   id: z.string(),
 *   name: z.string(),
 *   }).openapi('Item');
 *
 * type Item = z.infer<typeof ItemSchema>;
 *
 * @HttpController({ path: '/items' })
 * export class MyController {
 *   @Get({ description: 'Get all items',
 *     directResponse: {
 *       description: 'A list of items',
 *       jsonContent: { schema: z.array(ItemSchema) }
 *     }
 *   })
 *   async getItems(@Request() req: HttpRequest): Promise<Item[]> {
 *     // Handle GET /api/items
 *   }
 *
 *   @Post({
 *     description: 'Create a new item',
 *     responses: {
 *       201: {
 *         description: 'Item created'
 *       }
 *     }
 *   })
 *   async createItem(@Body({ schema: z.object({ name: z.string() }) }) body: { name: string }): Promise<void> {
 *     // Handle POST /api/items
 *   }
 * }
 * ```
 */
export function HttpController(config: ControllerConfig): ClassDecorator {
  return target => {
    const metadata: HttpControllerMetadata = {
      type: 'http-controller',
      ...config,
    };
    Reflect.defineMetadata(FUNCTION_HANDLER_METADATA, metadata, target);
    decorate(injectable(), target);
  };
}

/**
 * Method decorator to define an HTTP GET controllerMethod.
 *
 * @param operationConfig
 * @return Method decorator function
 *
 * @example
 * ```ts
 * @HttpController({ path: '/items' })
 * class MyController {
 *   @Get({
 *     path: '/{id}',
 *     description: 'Get item by ID',
 *     directResponse: {
 *       status: 200,
 *       description: 'A single item',
 *       jsonContent: { schema: z.object({ id: z.string(), name: z.string() }) },
 *     }
 *   })
 *   async getItemById(@PathParam({ name: 'id', schema: z.string().uuid() }) id: string): Promise<{ id: string; name: string }> {
 *     // Handle GET /item/{id}
 *     return { id, name: 'Sample Item' };
 *   }
 * }
 * ```
 */
export function Get(operationConfig?: ControllerOperationConfig): MethodDecorator {
  return provideControllerOperationDecorator({ method: 'get', ...operationConfig });
}

/**
 * Method decorator to define an HTTP HEAD controllerMethod.
 *
 * @param operationConfig
 * @return Method decorator function
 */
export function Head(operationConfig?: ControllerOperationConfig): MethodDecorator {
  return provideControllerOperationDecorator({ method: 'head', ...operationConfig });
}

/**
 * Method decorator to define an HTTP DELETE controllerMethod.
 *
 * @param operationConfig
 * @return Method decorator function
 *
 * @example
 * ```ts
 * @HttpController({ path: '/items' })
 * class MyController {
 *   @Delete({
 *     path: '/{id}',
 *     description: 'Delete item by ID',
 *    directResponse: {
 *       description: 'Item deleted successfully',
 *       status: 204,
 *     },
 *     responses: {
 *       404: {
 *         description: 'Item not found',
 *       },
 *     }, *   })
 *   async deleteItemById(@PathParam({ name: 'id', schema: z.string().uuid() }) id: string): Promise<void> {
 *     // Handle DELETE /item/{id}
 *     const item = await this.itemsRepository.getItemById(id);
 *     if (!item) {
 *       throw new NotFoundError('Item not found', { details: { id } });
 *     }
 *     await this.itemsRepository.deleteItemById(id);
 *   }
 * }
 *   ```
 */
export function Delete(operationConfig?: ControllerOperationConfig): MethodDecorator {
  return provideControllerOperationDecorator({ method: 'delete', ...operationConfig });
}

/**
 * Method decorator to define an HTTP POST controllerMethod.
 * @param operationConfig
 * @return Method decorator function
 *
 * @example
 * ```ts
 * @HttpController({ path: '/items' })
 * class MyController {
 *   @Post({
 *     description: 'Create a new item',
 *     directResponse: {
 *       description: 'Item created successfully',
 *       status: 201,
 *       jsonContent: { schema: z.object({ id: z.string(), name: z.string() }) },
 *     },
 *   })
 *   async createItem(@Body({ schema: z.object({ name: z.string() }) }) body: { name: string }): Promise<{ id: string; name: string }> {
 *     // Handle POST /items
 *   }
 * }
 * ```
 */
export function Post(operationConfig?: ControllerRequestBodyOperationConfig): MethodDecorator {
  return provideControllerOperationDecorator({ method: 'post', ...operationConfig });
}

/**
 * Method decorator to define an HTTP PUT controllerMethod.
 *
 * @param operationConfig
 * @return Method decorator function
 *
 * @example
 * ```ts
 * @HttpController({ path: '/items' })
 * class MyController {
 *   @Put({
 *     path: '/{id}',
 *     description: 'Update item by ID',
 *     directResponse: {
 *       description: 'Item updated successfully',
 *       status: 204,
 *       jsonContent: { schema: z.object({ id: z.string(), name: z.string() }) },
 *     },
 *     responses: {
 *       404: {
 *         description: 'Item not found',
 *       },
 *     },
 *   })
 *   async updateItemById(
 *     @PathParam({ name: 'id', schema: z.string().uuid() }) id: string,
 *     @Body({ schema: z.object({ name: z.string() }) }) body: { name: string }
 *   ): Promise<{ id: string; name: string }> {
 *     // Handle PUT /item/{id}
 *     const item = await this.itemsRepository.getItemById(id);
 *     if (!item) {
 *       throw new NotFoundError('Item not found', { details: { id } });
 *     }
 *     const updatedItem = await this.itemsRepository.updateItemById(id, body);
 *     return updatedItem;
 *   }
 * }
 * ```
 */

export function Put(operationConfig?: ControllerRequestBodyOperationConfig): MethodDecorator {
  return provideControllerOperationDecorator({ method: 'put', ...operationConfig });
}

/**
 * Method decorator to define an HTTP PATCH controllerMethod.
 *
 * @param operationConfig
 * @return Method decorator function
 *
 * @example
 * ```ts
 * @HttpController({ path: '/items' })
 * class MyController {
 *   @Patch({
 *     path: '/{id}',
 *     description: 'Partially update item by ID',
 *     directResponse: {
 *       description: 'Item updated successfully',
 *       status: 204,
 *       jsonContent: { schema: z.object({ id: z.string(), name: z.string() }) },
 *     },
 *     responses: {
 *       404: {
 *         description: 'Item not found',
 *       },
 *     }
 *   })
 *   async partiallyUpdateItemById(
 *     @PathParam({ name: 'id', schema: z.string().uuid() }) id: string,
 *     @Body({ schema: z.object({ name: z.string().optional() }) }) body: { name?: string }
 *   ): Promise<{ id: string; name: string }> {
 *     // Handle PATCH /item/{id}
 *     const item = await this.itemsRepository.getItemById(id);
 *     if (!item) {
 *       throw new NotFoundError('Item not found', { details: { id } });
 *     }
 *     const updatedItem = await this.itemsRepository.partiallyUpdateItemById(id, body);
 *     return updatedItem;
 *   }
 * }
 * ```
 */
export function Patch(operationConfig?: ControllerRequestBodyOperationConfig): MethodDecorator {
  return provideControllerOperationDecorator({ method: 'patch', ...operationConfig });
}

function provideControllerOperationDecorator(baseMetadata: ControllerOperationBaseMetadata): MethodDecorator {
  return (target, propertyKey) => {
    const ownMetadata = Reflect.getOwnMetadata(FUNCTION_HANDLER_METADATA, target, propertyKey) as
      | ControllerOperationArgsMetadata
      | undefined;
    const argsMetadata =
      ownMetadata ?? shared.initializeMetadata<ControllerOperationArgMetadata>(target, propertyKey, getCommonArg);
    const metadata: ControllerOperationMetadata = {
      type: 'http-controller',
      ...baseMetadata,
      ...argsMetadata,
    };
    Reflect.defineMetadata(FUNCTION_HANDLER_METADATA, metadata, target, propertyKey);
  };
}

/**
 * Parameter decorator to define the HTTP request body.
 *
 * @param bodyConfig
 * @returns Parameter decorator function
 *
 * @example
 * ```ts
 * @HttpController({ path: '/items' })
 * class MyController {
 *   @Post({
 *     description: 'Create a new item',
 *     responses: {
 *       201: {
 *         description: 'Item created'
 *       }
 *     }
 *   })
 *   async createItem(@Body({ schema: z.object({ name: z.string() }) }) body: { name: string }): Promise<void> {
 *     // Handle POST /items
 *   }
 * }
 * ```
 */
export function Body(bodyConfig: ControllerRequest): ParameterDecorator {
  return adjustOperationMetadata({
    type: 'body',
    ...bodyConfig,
  });
}

/**
 * Configuration for the {@link PathParam} decorator.
 *
 * @property name - The name of the path parameter as defined in the route.
 * @property schema - Optional Zod schema to validate the path parameter.
 *
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
 * ```ts
 * @HttpController({ path: '/items' })
 * class MyController {
 *   @Get({
 *     path: '/{id}',
 *     description: 'Get item by ID',
 *     responses: {
 *       200: {
 *         description: 'Successful directResponse',
 *         schema: z.object({ id: z.string(), name: z.string() })
 *       }
 *     }
 *   })
 *   async getItemById(@PathParam({ name: 'id', schema: z.string().uuid() }) id: string): Promise<{ id: string; name: string }> {
 *     // Handle GET /item/{id}
 *     return { id, name: 'Sample Item' };
 *   }
 * }
 * ```
 */
export function PathParam(config: PathParamConfig): ParameterDecorator {
  return adjustOperationMetadata({
    type: 'path',
    ...config,
  });
}

/**
 * Configuration for the {@link QueryParam} decorator.
 *
 * @property name - The name of the query parameter.
 * @property schema - Optional schema to validate the query parameter.
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
 * ```ts
 * @HttpController({ path: '/items' })
 * class MyController {
 *   @Get({
 *     description: 'Search items',
 *     responses: {
 *       200: {
 *         description: 'Successful directResponse',
 *         schema: z.array(z.object({ id: z.string(), name: z.string() }))
 *       }
 *     }
 *   })
 *   async searchItems(@QueryParam({ name: 'query', schema: z.string().min(3) }) query: string): Promise<{ id: string; name: string }[]> {
 *     // Handle GET /items?query=searchTerm
 *     return [{ id: '1', name: 'Sample Item' }];
 *   }
 * }
 * ```
 */
export function QueryParam(config: QueryParamConfig): ParameterDecorator {
  return adjustOperationMetadata({
    type: 'query',
    ...config,
  });
}

/**
 * Configuration for the {@link HeaderParam} decorator.
 *
 * @property name - The name of the header parameter.
 * @property schema - Optional Zod schema to validate the header parameter.
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
 * ```ts
 * @HttpController({ path: '/items' })
 * class MyController {
 *   @Get({
 *     description: 'Get items with custom header',
 *     responses: {
 *       200: {
 *         description: 'Successful directResponse',
 *         schema: z.array(z.object({ id: z.string(), name: z.string() }))
 *       }
 *     }
 *   })
 *   async getItems(@HeaderParam({ name: 'X-Custom-Header', schema: z.string().optional() }) customHeader: string | undefined): Promise<{ id: string; name: string }[]> {
 *     // Handle GET /items with custom header
 *     return [{ id: '1', name: 'Sample Item' }];
 *   }
 * }
 * ```
 */
export function HeaderParam(config: HeaderParamConfig): ParameterDecorator {
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
 * ```ts
 * @HttpController({ path: '/items' })
 * class MyController {
 *   @Get({
 *     description: 'Get all items',
 *     responses: {
 *       200: {
 *         description: 'Successful directResponse',
 *         schema: z.array(z.object({ id: z.string(), name: z.string() }))
 *       }
 *     }
 *   })
 *   async getItems(@Request() req: HttpRequest): Promise<{ id: string; name: string }[]> {
 *     // Handle GET /api/items
 *     const name = req.query.get('name');
 *     return [{ id: '1', name: name ?? 'Sample Item' }];
 *   }
 * }
 * ```
 */
export function Request(): ParameterDecorator {
  return adjustOperationMetadata({
    type: 'request',
  });
}

/**
 * Parameter decorator to inject the authentication context.
 * Injects an object containing information about the authenticated user, such as their principal and claims.
 * Injection should be used of type {@link AuthContext}.
 *
 * @returns Parameter decorator function
 *
 * @example
 * ```ts
 * @HttpController({ path: '/items' })
 * class MyController {
 *   @Get({
 *     description: 'Get all items',
 *     responses: {
 *       200: {
 *         description: 'Successful directResponse',
 *         schema: z.array(z.object({ id: z.string(), name: z.string() }))
 *       }
 *     }
 *   })
 *   async getItems(@AuthCtx() authContext: AuthContext): Promise<{ id: string; name: string }[]> {
 *     // Handle GET /api/items
 *     const userId = authContext.principal?.subject ?? 'unknown';
 *     return [{ id: '1', name: `Sample Item for user ${userId}` }];
 *   }
 * }
 * ```
 */
export function AuthCtx() {
  return adjustOperationMetadata({
    type: 'authContext',
  });
}

function adjustOperationMetadata(operationArg: ControllerOperationArgMetadata): ParameterDecorator {
  return adjustMetadata(FUNCTION_HANDLER_METADATA, operationArg, getCommonArg);
}

function getCommonArg(): ControllerOperationCommonArgMetadata {
  return shared.getCommonArg() as ControllerOperationCommonArgMetadata;
}
