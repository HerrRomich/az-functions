import {
  DEFAULT_LOG_LEVEL,
  LogLevel,
  LogLevelProvider,
  SYSTEM_LOGGER_NAME_PREFIX,
  TrieSearchService,
} from '@herrromich/az-functions';
import { inject, optional } from 'inversify';
import { PERSISTENCE_KYSELY_LOGGER_NAME } from '../persistence/module';

export class TrieSearchLogLevelProvider extends TrieSearchService<LogLevel> implements LogLevelProvider {
  constructor(@inject(DEFAULT_LOG_LEVEL) @optional() defaultLogLevel: LogLevel) {
    super('.', defaultLogLevel);
    this.set(SYSTEM_LOGGER_NAME_PREFIX, 'silly');
    this.set(PERSISTENCE_KYSELY_LOGGER_NAME, 'error');
  }

  getLogLevel(loggerName: string | undefined): LogLevel | undefined {
    return this.find(loggerName);
  }
}
