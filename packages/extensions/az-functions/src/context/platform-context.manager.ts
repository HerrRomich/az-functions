import { injectable } from 'inversify';
import { AsyncLocalStorage } from 'node:async_hooks';
import { serviceIdentifier } from 'shared';
import { PlatformContext } from './platform-context.model';

/**
 * A unique identifier for the PlatformContextManager service.
 * This identifier can be used for dependency injection and service resolution.
 */
export const PLATFORM_CONTEXT_MANAGER = serviceIdentifier<PlatformContextManager>('AzFunction.ContextManager');

/**
 * Interface representing a manager for PlatformContext instances.
 * The manager provides methods to access the active context and to run code within a specific context.
 *
 * - `active()`: Returns the currently active PlatformContext, or undefined if no context is active.
 * - `runWith(platformContext, callback)`: Runs the provided callback function within the specified PlatformContext.
 *   The callback will have access to the context during its execution.
 */
export interface PlatformContextManager {
  active(): PlatformContext | undefined;
  runWith<T>(platformContext: PlatformContext, callback: () => T): T;
}

@injectable()
export class BasePlatformContextManager implements PlatformContextManager {
  private readonly storage = new AsyncLocalStorage<PlatformContext>();

  runWith<T>(platformContext: PlatformContext, callback: () => T): T {
    return this.storage.run(platformContext, callback);
  }

  active(): PlatformContext | undefined {
    return this.storage.getStore();
  }
}
