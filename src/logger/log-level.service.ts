import { serviceIdentifier } from 'shared';
import { LogLevel } from './logger.model';

export const LOG_LEVEL_SERVICE = serviceIdentifier<ILogLevelService>('LOG_LEVEL_SERVICE');

export interface ILogLevelService {
  getLogLevel(category: string | undefined): LogLevel;
}
