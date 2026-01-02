import { inject, injectable, optional } from 'inversify';
import { PlatformContextLocalStorage } from 'shared';
import { LEVEL } from 'triple-beam';
import * as Transport from 'winston-transport';
import { ILogLevelService, LOG_LEVEL_SERVICE } from './log-level.service';
import { CombinedMessage, DEFAULT_LOG_LEVEL, ILogger, LOG_LEVELS, logLevelOrDefault } from './logger.model';
import { PlatformLogger } from './platform.logger';

@injectable()
export class AzureLogTransport extends Transport {
  constructor(
    @inject(PlatformContextLocalStorage)
    @optional()
    private readonly contextStorage: PlatformContextLocalStorage | undefined,
    @inject(PlatformLogger)
    private readonly platformLogger: PlatformLogger,
    @inject(LOG_LEVEL_SERVICE) @optional() private readonly logLevelsService: ILogLevelService | undefined,
  ) {
    super();
  }

  private getLogger(): ILogger {
    return this.contextStorage?.getStore()?.invocationContext ?? this.platformLogger;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  log(info: any, next: () => void): any {
    const logger = this.getLogger();
    const {
      [LEVEL]: level,
      message,
      stack,
      cause,
      category,
    }: {
      [LEVEL]: string;
      message: string;
      stack?: string;
      cause?: Error;
      category?: string;
    } = info;
    setImmediate(() => {
      this.emit('logged', info);
    });
    const currentLogLevel = logLevelOrDefault(level, DEFAULT_LOG_LEVEL);
    const currentLogLevelVal = LOG_LEVELS[currentLogLevel];
    const availableLogLevel = this.logLevelsService?.getLogLevel(category) ?? DEFAULT_LOG_LEVEL;
    const availableLogLevelVal = LOG_LEVELS[availableLogLevel];
    if (currentLogLevelVal > availableLogLevelVal) {
      if (next) {
        next();
      }
      return;
    }
    const combinedMessage: CombinedMessage = {
      message,
    };
    if (stack !== undefined) {
      const stacks = [stack];
      let current = cause;
      while (current) {
        if (current.stack) stacks.push(current.stack);
        current = current.cause as Error | undefined;
      }
      combinedMessage.stack = stacks.join('\nCaused by:\n');
    }
    if (category !== undefined) {
      combinedMessage.category = category;
    }
    switch (currentLogLevel) {
      case 'error':
        logger.error(combinedMessage);
        break;
      case 'warn':
        logger.warn(combinedMessage);
        break;
      case 'info':
        logger.info(combinedMessage);
        break;
      case 'debug':
        logger.debug(combinedMessage);
        break;
      case 'verbose':
        logger.trace(combinedMessage);
        break;
    }
    if (next) {
      next();
    }
  }
}
