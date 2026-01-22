import { InvocationContext } from '@azure/functions';
import * as winston from 'winston';
import { PlatformContext, PlatformContextError, PlatformContextValueKey } from './platform-context.model';
import { ORIGINAL_INVOCATION_CONTEXT_VALUE_KEY } from './platform-context.provider';
import { WrappedInvocationContext } from './wrapped-invocation-context';

export class PlatformExecutionContext implements PlatformContext {
  private readonly data: Map<PlatformContextValueKey, unknown>;
  readonly invocationContext: InvocationContext;
  private readonly logger;

  constructor(invocationContext: InvocationContext, logger: winston.Logger) {
    this.logger = logger.child({});
    this.invocationContext = new WrappedInvocationContext(invocationContext, this.logger);
    this.data = new Map<PlatformContextValueKey, unknown>();
    this.data.set(ORIGINAL_INVOCATION_CONTEXT_VALUE_KEY, invocationContext);
  }

  getValue<T>(key: PlatformContextValueKey<T>): T | undefined {
    return this.data.get(key) as T | undefined;
  }

  setValue<T>(key: PlatformContextValueKey<T>, value: T): PlatformContext {
    this.data.set(key, value);
    return this;
  }

  deleteValue(key: PlatformContextValueKey): PlatformContext {
    this.data.delete(key);
    return this;
  }

  clone(): PlatformContext {
    const originalContext = this.getValue(ORIGINAL_INVOCATION_CONTEXT_VALUE_KEY);
    if (!originalContext) {
      throw new PlatformContextError('Original invocation context is missing');
    }
    const clonedContext = new PlatformExecutionContext(originalContext, this.logger);
    for (const [key, value] of this.data.entries()) {
      clonedContext.setValue(key, value);
    }
    return clonedContext;
  }
}
