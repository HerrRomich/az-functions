import { InvocationContext } from '@azure/functions';
import { injectable } from 'inversify';
import { serviceIdentifier } from 'shared';
import * as winston from 'winston';
import { createPlatformContextValueKey, PlatformContext } from './platform-context.model';
import { PlatformExecutionContext } from './platform.execution.context';

/**
 * A unique identifier for the PlatformContextProvider service.
 * This identifier can be used for dependency injection and service resolution.
 */
export const PLATFORM_CONTEXT_PROVIDER = serviceIdentifier<PlatformContextProvider>(
  'AzFunctions.Platform.ContextProvider',
);

/**
 * Interface representing a provider for PlatformContext instances.
 * The provider is responsible for creating and providing PlatformContext instances based on the given InvocationContext.
 *
 * - `providePlatformContext(invocationContext)`: Creates and returns a PlatformContext instance for the provided InvocationContext.
 */
export interface PlatformContextProvider {
  providePlatformContext(invocationContext: InvocationContext): PlatformContext;
}

export const ORIGINAL_INVOCATION_CONTEXT_VALUE_KEY = createPlatformContextValueKey<InvocationContext>(
  'AzFunctions.Platform.OriginalInvocationContext',
);

@injectable()
export class PlatformExecutionContextProvider implements PlatformContextProvider {
  constructor(private readonly logger: winston.Logger) {}

  providePlatformContext(invocationContext: InvocationContext): PlatformContext {
    return new PlatformExecutionContext(invocationContext, this.logger);
  }
}
