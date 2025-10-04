import { InvocationContext } from '@azure/functions';
import * as winston from 'winston';
import * as Transport from 'winston-transport';
import { PlatformContextLocalStorage } from 'shared';

type ILogger = Pick<InvocationContext, 'log' | 'trace' | 'debug' | 'info' | 'warn' | 'error'>;

const SPLAT_SYMBOL = Symbol.for('splat');
const LEVEL_SYMBOL = Symbol.for('level');

export const LOGGER_SETTINGS = Symbol.for('LOGGER_SETTINGS');
export const LOGGER_FACTORY = Symbol.for('LOGGER_FACTORY');
export type LoggerSettings = Pick<winston.LoggerOptions, 'level' | 'format'>;

export type Logger = Pick<winston.Logger, 'error' | 'warn' | 'info' | 'debug' | 'verbose'>;
export type LoggerFactory = (service?: string) => Logger;

export class AzureLogTransporter extends Transport {
  private getLogger(): ILogger {
    return this.contextStorage.getStore()?.invocationContext ?? console;
  }

  constructor(
    private readonly contextStorage: PlatformContextLocalStorage,
    opt?: Transport.TransportStreamOptions,
  ) {
    super({ ...opt });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  log(info: any, next: () => void): any {
    const logger = this.getLogger();
    const { [LEVEL_SYMBOL]: level, message, stack, [SPLAT_SYMBOL]: splat } = info;
    setImmediate(() => {
      this.emit('logged', info);
    });
    let combinedMessage: string = message;
    if (stack) {
      combinedMessage = combinedMessage.concat('\n', stack);
    }
    const args = Array.isArray(splat) ? [...splat] : [];
    switch (level) {
      case 'error':
        logger.error(combinedMessage, ...args);
        break;
      case 'warn':
        logger.warn(combinedMessage, ...args);
        break;
      case 'info':
        logger.info(combinedMessage, ...args);
        break;
      case 'debug':
        logger.debug(combinedMessage, ...args);
        break;
      case 'trace':
        logger.trace(combinedMessage, ...args);
        break;
      default:
        logger.log(combinedMessage, ...args);
        break;
    }
    if (next) {
      next();
    }
  }
}
