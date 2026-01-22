import { FUNCTION_HANDLER_METADATA } from '../platform.model';
import {
  ArgMetadata,
  ArgMetadataProvider,
  ArgsMetadata,
  AzFunctionsDecoratorError,
  CommonArgMetadata,
} from './decorators.model';

export function adjustMetadata<T extends ArgMetadata>(
  metadataKey: unknown,
  operationArg: T,
  argMetadataProvider: ArgMetadataProvider<T>,
): ParameterDecorator {
  return (target, propertyKey, parameterIndex) => {
    if (propertyKey === undefined) {
      throw new AzFunctionsDecoratorError('The decorator can only be used on method parameters.');
    }
    const metadata: ArgsMetadata<T> =
      Reflect.getOwnMetadata(metadataKey, target, propertyKey) ??
      initializeMetadata(target, propertyKey, argMetadataProvider);
    metadata.args[parameterIndex] = operationArg;
    Reflect.defineMetadata(metadataKey, metadata, target, propertyKey);
  };
}

export function initializeMetadata<T extends ArgMetadata>(
  target: object,
  propertyKey: string | symbol,
  argMetadataProvider: ArgMetadataProvider<T>,
): ArgsMetadata<T> {
  const paramTypes = Reflect.getOwnMetadata('design:paramtypes', target, propertyKey) as unknown[] | undefined;
  if (!paramTypes) {
    throw new AzFunctionsDecoratorError(
      `Method ${target.constructor.name}.${String(propertyKey)} doesn't exist or has no metadata. Be sure to import reflect-metadata.`,
    );
  }
  return {
    args: paramTypes.map(paramType => argMetadataProvider(paramType)),
  };
}

export function getCommonArg(): CommonArgMetadata {
  return { type: 'undefined' };
}

/**
 * Parameter decorator to inject the Azure Functions `InvocationContext` into a function parameter.
 *
 * @example
 * ```ts
 * @HttpController({
 *  path: '/users',
 *  })
 *  export class UserController {
 *  constructor(private readonly adUsersService: AdUsersService
 *   private readonly usersMapper: UsersMapper) {}
 *
 *  @Get({
 *   directResponse: {
 *    contentSchema: usersResponseDtoSchema,
 *    description: 'Returns a list of users',
 *   },
 *  })
 *  async getUsers(@InvocationCtx() invocationCtx: InvocationContext): Promise<UsersResponseDto> {
 *   invocationCtx.log.info('Requesting users.');
 *
 *   const adUsers = await this.adUsersService.getUsers();
 *   const items = this.usersMapper.fromAdUsers(adUsers);
 *
 *   invocationCtx.log.info('Responding users.');
 *   invocationCtx.log.debug('Responding %n users.', items.length);
 *
 *   return { items };
 *  }
 * }
 * ```
 */
export function InvocationCtx() {
  return adjustMetadata(
    FUNCTION_HANDLER_METADATA,
    {
      type: 'invocationContext',
    } as CommonArgMetadata,
    getCommonArg,
  );
}
