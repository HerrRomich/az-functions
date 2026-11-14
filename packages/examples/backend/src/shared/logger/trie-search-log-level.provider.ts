import {
  DEFAULT_LOG_LEVEL,
  LogLevel,
  LogLevelProvider,
  serviceIdentifier,
  SYSTEM_LOGGER_NAME_PREFIX,
  TrieSearchService,
} from '@herrromich/az-functions';
import { inject, optional } from 'inversify';

export interface LogLevelDefault {
  key: string;
  value: LogLevel;
}
export const LOG_LEVEL_DEFAULTS = serviceIdentifier<LogLevelDefault>('LogLeveLDefaults');

export class TrieSearchLogLevelProvider extends TrieSearchService<LogLevel> implements LogLevelProvider {
  constructor(
    @inject(DEFAULT_LOG_LEVEL) @optional() defaultLogLevel: LogLevel,
    @inject(LOG_LEVEL_DEFAULTS) @optional() logLevelDefaults: LogLevelDefault[],
  ) {
    super('.', defaultLogLevel);
    this.set(SYSTEM_LOGGER_NAME_PREFIX, 'silly');
    logLevelDefaults?.forEach(({ key, value }) => this.set(key, value));
  }

  getLogLevel(loggerName: string | undefined): LogLevel | undefined {
    return this.find(loggerName);
  }
}
