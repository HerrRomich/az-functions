import { InvocationContext } from '@azure/functions';
import { AzFunctionsRuntimeError } from 'shared';

/**
 * Error class representing errors related to the platform context in Azure Functions.
 * This class extends the AzFunctionsRuntimeError and can be used to throw errors specific to platform context operations.
 */
export class PlatformContextError extends AzFunctionsRuntimeError {}

/**
 * Type representing a unique key for storing and retrieving values in the PlatformContext.
 * The key is created using a symbol, ensuring uniqueness across the application.
 * The generic type parameter T allows for type safety when associating values with the key.
 *
 * @template T - The type of the value associated with the key.
 */
export type PlatformContextValueKey<T = unknown> = symbol & { __type: T };

/**
 * Creates a unique key for storing and retrieving values in the PlatformContext.
 * The key is created using a symbol, ensuring uniqueness across the application.
 *
 * @template T - The type of the value associated with the key.
 * @param key - The unique string identifier for the key.
 * @returns A unique PlatformContextValueKey for the specified type.
 *
 * @example
 * const MY_KEY = createPlatformContextValueKey<MyType>('MyUniqueKey');
 *
 * // Retrieve a value from the PlatformContext using the key
 * const value = platformContext.getValue(MY_KEY);
 *
 * // Set a value in the PlatformContext using the key
 * platformContext.setValue(MY_KEY, myValue);
 *
 * // Delete a value from the PlatformContext using the key
 * platformContext.deleteValue(MY_KEY);
 */
export function createPlatformContextValueKey<T>(key: string): PlatformContextValueKey<T> {
  return Symbol.for(key) as PlatformContextValueKey<T>;
}

/**
 * Interface representing the platform context in Azure Functions.
 * The PlatformContext provides access to the invocation context and allows storing and retrieving values associated with the context.
 *
 * - `invocationContext`: The InvocationContext associated with the current execution.
 * - `getValue(key)`: Retrieves a value associated with the specified key from the context.
 * - `setValue(key, value)`: Sets a value associated with the specified key in the context.
 * - `deleteValue(key)`: Deletes a value associated with the specified key from the context.
 * - `clone()`: Creates a deep copy of the current PlatformContext, preserving its values and invocation context.
 */
export interface PlatformContext {
  readonly invocationContext: InvocationContext;
  getValue<T>(key: PlatformContextValueKey<T>): T | undefined;
  setValue<T>(key: PlatformContextValueKey<T>, value: T): PlatformContext;
  deleteValue(key: PlatformContextValueKey): PlatformContext;
  clone(): PlatformContext;
}
