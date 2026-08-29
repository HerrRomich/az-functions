import { inject, injectable, optional } from 'inversify';
import { DEFAULT_LOG_LEVEL, LOG_LEVEL_PROVIDER, LogLevel, LogLevelProvider } from './logger.model';

@injectable()
export class LogLevelService {
  constructor(
    @inject(LOG_LEVEL_PROVIDER) @optional() private readonly logLevelsProvider: LogLevelProvider | undefined,
    @inject(DEFAULT_LOG_LEVEL) private readonly defaultLogLevel: LogLevel,
  ) {}

  getLogLevel(loggerName: string | undefined): LogLevel {
    return this.logLevelsProvider?.getLogLevel(loggerName) ?? this.defaultLogLevel;
  }
}
