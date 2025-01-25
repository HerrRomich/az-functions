import { InvocationContext } from '@azure/functions';
import { UserAccount } from './security.model';

export const BASE_DIR = Symbol.for('BASE_DIR');
export const PLATFORM_CONTAINER = Symbol.for('PLATFORM_CONTAINER');
export const PLATFORM_MODE = Symbol.for('PLATFORM_MODE');

export const AZURE_FUNCTION_METADATA_KEY = 'azure_function';

export type PlatformMode = 'start' | 'print-open-api';

export class AzureFunctionRegistrationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'AzureFunctionRegistrationError';
    Object.setPrototypeOf(this, AzureFunctionRegistrationError.prototype);
  }
}
export const AZURE_FUNCTION = Symbol.for('AZURE_FUNCTION');

export type AzureFunctions = object;

export type AzureFunctionsConstructor = new (...args: never[]) => AzureFunctions;

export interface PlatformContext {
  readonly invocationContext?: InvocationContext;
  readonly userAccount?: UserAccount;
}

export class PlatformError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'PlatformError';
    Object.setPrototypeOf(this, PlatformError.prototype);
  }
}
