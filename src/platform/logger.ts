import { InvocationContext } from '@azure/functions';
import { LoggerOptions } from 'winston';
import * as Transport from 'winston-transport';
import { PlatformContextLocalStorage } from '../shared/platform-context-local-storage';

type ILogger = Pick<InvocationContext, 'log' | 'trace' | 'debug' | 'info' | 'warn' | 'error'>;

export const LOGGER_SETTINGS = Symbol.for('LOGGER_SETTINGS');
export type LoggerSettings = Pick<LoggerOptions, 'level' | 'format'>;

export class AzureLogTransporter extends Transport {
  private getLogger(): ILogger {
    return this.contextStorage.getStore()?.invocationContext ?? console;
  }

  constructor(
    private readonly contextStorage: PlatformContextLocalStorage,
    opt?: Transport.TransportStreamOptions,
  ) {
    super(opt);
  }

  log(info: any, next: () => void): any {
    const logger = this.getLogger();
    const { level, ...logData } = Object.entries(info).reduce((prev, [key, value]) => {
      prev[key] = value;
      return prev;
    }, {} as any);
    setImmediate(() => {
      this.emit('logged', info);
    });
    switch (level) {
      case 'error':
        logger.error(logData);
        break;
      case 'warn':
        logger.warn(logData);
        break;
      case 'info':
        logger.info(logData);
        break;
      case 'debug':
        logger.debug(logData);
        break;
      case 'trace':
        logger.trace(logData);
        break;
      default:
        logger.log(logData);
        break;
    }
    next();
  }
}
