import { InvocationContext } from '@azure/functions';
import { AZURE_FUNCTION_METADATA_KEY, AzureFunction, PlatformError } from '../platform.model';
import { ArgMetadata, ArgMetadataProvider, ArgsMetadata, CommonArgMetadata } from './decorators.model';

export function adjustMetadata<T extends ArgMetadata>(
  metadataKey: unknown,
  operationArg: T,
  argMetadaProvider: ArgMetadataProvider<T>,
): ParameterDecorator {
  return (target, propertyKey, parameterIndex) => {
    if (propertyKey === undefined) {
      throw new PlatformError('The decorator can only be used on method parameters.');
    }
    const metadata: ArgsMetadata<T> =
      Reflect.getOwnMetadata(metadataKey, target, propertyKey) ??
      initializeMetadata(target, propertyKey, argMetadaProvider);
    metadata.args[parameterIndex] = operationArg;
    Reflect.defineMetadata(metadataKey, metadata, target, propertyKey);
  };
}

export function initializeMetadata<T extends ArgMetadata>(
  target: AzureFunction,
  propertyKey: string | symbol,
  argMetadaProvider: ArgMetadataProvider<T>,
): ArgsMetadata<T> {
  const paramTypes = Reflect.getOwnMetadata('design:paramtypes', target, propertyKey) as unknown[] | undefined;
  if (!paramTypes) {
    throw new PlatformError(
      `Method ${target.constructor.name}.${String(propertyKey)} doesn't exist or has no metadata. Be sure to import reflect-metadata.`,
    );
  }
  return {
    args: paramTypes.map(paramType => argMetadaProvider(paramType)),
  };
}

export function getCommonArg(paramType: unknown): CommonArgMetadata {
  if (paramType === InvocationContext) {
    return { type: 'context' };
  } else {
    return { type: 'undefined' };
  }
}

/**
 * Parameter decorator to inject the Azure Functions `InvocationContext` into a function parameter.
 *
 * @example
 * ```typescript
 * @HttpController({
 *  path: '/users',
 *  })
 *  export class UserController {
 *  constructor(private readonly adUsersService: AdUsersService
 *   private readonly usersMapper: UsersMapper) {}
 *
 *  @HttpGet({
 *   response: {
 *    contentSchema: usersResponseDtoSchema,
 *    description: 'Returns a list of users',
 *   },
 *  })
 *  async getUsers(@Context() context: InvocationContext): Promise<UsersResponseDto> {
 *   context.log.info('Requesting users.');
 *
 *   const adUsers = await this.adUsersService.getUsers();
 *   const items = this.usersMapper.fromAdUsers(adUsers);
 *
 *   context.log.info('Responding users.');
 *   context.log.debug('Responding %n users.', items.length);
 *
 *   return { items };
 *  }
 * }
 * ```
 */
export function context() {
  return adjustMetadata(
    AZURE_FUNCTION_METADATA_KEY,
    {
      type: 'context',
    },
    getCommonArg,
  );
}
