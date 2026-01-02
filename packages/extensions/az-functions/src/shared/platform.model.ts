import { InvocationContext } from '@azure/functions';
import * as util from 'node:util';
import { z } from 'zod';
import { UserAccount } from './security.model';

export const BASE_DIR = Symbol.for('BASE_DIR');
export const PLATFORM_CONTAINER = Symbol.for('PLATFORM_CONTAINER');
export const PLATFORM_MODE = Symbol.for('PLATFORM_MODE');

export const AZURE_FUNCTION_METADATA_KEY = 'azure_function';

export const platformModeSchema = z.enum(['start', 'print-open-api']).catch('start');
export type PlatformMode = z.infer<typeof platformModeSchema>;

export class AzureFunctionError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function errorToString(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === 'string') {
    return err;
  }
  if (typeof err === 'object' && err !== null) {
    try {
      return util.inspect(err, { depth: null });
    } catch {
      return String(err);
    }
  }
  return String(err);
}

export class AzureFunctionRegistrationError extends AzureFunctionError {}

/**
 * Token to register Azure Functions in the DI container.
 *
 * @example
 * ```typescript
 * @httpController({
 *   path: '/users',
 * })
 * export class UserController {
 *  constructor(private readonly adUsersService: AdUsersService
 *    private readonly usersMapper: UsersMapper) {}
 *
 *    @httpGet({
 *      response: {
 *        contentSchema: usersResponseDtoSchema,
 *      },
 *    })
 *    async handle(
 *      @queryParam({ name: 'filter', schema: z.string().optional() }) filter: string | undefined,
 *      @queryParam({ name: 'top', schema: z.coerce.number().min(1).max(100).default(10) }) top: number,
 *      @context context: InvocationContext
 *    ): Promise<UsersResponseDto> {
 *      context.log.info(`Received request to fetch users with filter: ${filter} and top: ${top}`);
 *      const adUsers = await this.adUsersService.getUsers(filter, top);
 *      return this.usersMapper.toUsersResponseDto(adUsers);
 *    }
 * }
 *
 * iocContainer.bind<AzureFunction>(AZURE_FUNCTION).to(UserController);
 * ```
 */
export const AZURE_FUNCTION = Symbol.for('AZURE_FUNCTION');

export type AzureFunction = object;

export interface PlatformContext {
  readonly invocationContext?: InvocationContext;
  readonly userAccount?: UserAccount;
}

export class PlatformError extends AzureFunctionError {}
