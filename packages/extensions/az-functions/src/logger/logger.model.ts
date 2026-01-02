import { InvocationContext } from '@azure/functions';
import { serviceIdentifier } from 'shared';
import * as winston from 'winston';

export const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  verbose: 4,
} as const;

export type LogLevel = keyof typeof LOG_LEVELS;
export const DEFAULT_LOG_LEVEL: LogLevel = 'info';

export function isLogLevel(level: string): level is LogLevel {
  return level in LOG_LEVELS;
}
export function logLevelOrDefault(level: string, defaultLevel: LogLevel): LogLevel {
  return isLogLevel(level) ? level : defaultLevel;
}

export type ILogger = Pick<InvocationContext, 'log' | 'trace' | 'debug' | 'info' | 'warn' | 'error'>;

export type Logger = Pick<winston.Logger, 'error' | 'warn' | 'info' | 'debug' | 'verbose'>;

export type LoggerFactory = (service?: string) => Logger;
export const LOGGER_FACTORY = serviceIdentifier<LoggerFactory>('LOGGER_FACTORY');

export type LogMethod = (...args: unknown[]) => void;
export type ExtendedLogMethod = LogMethod | ((logMethod: LogMethod) => void);

export interface IAzLogger {
  log: ExtendedLogMethod;
  info: ExtendedLogMethod;
  warn: ExtendedLogMethod;
  error: ExtendedLogMethod;
  debug: ExtendedLogMethod;
  trace: ExtendedLogMethod;
}

export interface CombinedMessage {
  category?: string;
  message: string;
  stack?: string;
}

export const CLOUD_ROLE = process.env.APPINSIGHTS_CLOUDROLE ?? 'datahub';

export type LogCategoryProvider = () => string | undefined;
export const LOG_CATEGORY_PROVIDER = serviceIdentifier<LogCategoryProvider>('LOG_CATEGORY_PROVIDER');
