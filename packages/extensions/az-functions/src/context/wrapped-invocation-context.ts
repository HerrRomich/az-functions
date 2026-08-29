import { LogLevel as FunctionsLoglevel, InvocationContext } from '@azure/functions';
import { LogLevel } from 'logger';
import * as winston from 'winston';

const LOG_LEVEL_MAP: Record<FunctionsLoglevel, LogLevel> = {
  critical: 'error',
  error: 'error',
  warning: 'warn',
  information: 'info',
  debug: 'debug',
  trace: 'verbose',
  none: 'info',
};

export class WrappedInvocationContext extends InvocationContext {
  constructor(parentInvocationContext: InvocationContext, logger: winston.Logger) {
    super({
      ...parentInvocationContext,
      logHandler: (level, ...args) => {
        const translatedLogLevel = LOG_LEVEL_MAP[level];
        const [message, ...meta] = args;
        logger.log(translatedLogLevel, message as string, ...meta);
      },
    });
  }
}
