import { Container } from 'inversify';
import { z } from 'zod';
import { serviceIdentifier } from './ioc-container.utils';

export const BASE_DIR = serviceIdentifier<string>('Base Directory for Azure Functions');
export const PLATFORM_CONTAINER = serviceIdentifier<Container>('Platform Container');

export const FUNCTION_HANDLER_METADATA = Symbol.for('AzFunctions.Metadata.Handler');

export const platformModeSchema = z.enum(['start', 'print-open-api']).catch('start');

/**
 * Options for creating an AzFunctionsError.
 * @property {Record<string, unknown>} [details] - Optional additional details about the error.
 */
export interface AzFunctionsErrorOptions extends ErrorOptions {
  details?: Record<string, unknown>;
}

export abstract class AzFunctionsError extends Error {
  protected _details?: Record<string, unknown>;
  get details(): Readonly<Record<string, unknown>> | undefined {
    return this._details;
  }

  protected constructor(message?: string, options?: AzFunctionsErrorOptions) {
    super(message, options);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
    this._details = options?.details;
  }
}

export abstract class AzFunctionsSystemError extends AzFunctionsError {
  constructor(message?: string, options?: AzFunctionsErrorOptions) {
    super(message, options);
  }
}

/**
 * Abstract base class for runtime errors in Azure Functions.
 * @example
 * ```ts
 * class MyRuntimeError extends AzFunctionsRuntimeError {}
 * ```
 */
export class AzFunctionsRuntimeError extends AzFunctionsError {
  constructor(message?: string, options?: AzFunctionsErrorOptions) {
    super(message, options);
  }
}

export type TriggerHandlerClass<
  TInstance extends object = object,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TArgs extends unknown[] = any[],
> = new (...args: TArgs) => TInstance;

export interface TriggerHandlerClassMetadata {
  type: string;
}

export const TRIGGER_HANDLER_REGISTRATION_SERVICE = serviceIdentifier<TriggerHandlerRegistrationService>(
  'AzFunctions.TriggerHandler.RegistrationService',
);

export interface TriggerHandlerRegistrationService {
  register(triggerHandlerClass: TriggerHandlerClass): void;
}

export class HandlerArgsParseError extends AzFunctionsRuntimeError {}
