import { TraceContext } from '@azure/functions';
import { AnyValueMap } from '@opentelemetry/api-logs';
import { LoggerProvider } from '@opentelemetry/sdk-logs';
import { createPlatformContextValueKey } from 'context';
import { serviceIdentifier } from 'shared';
import * as winston from 'winston';

/**
 * Log levels for the logger.
 */
export const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
} as const;

export const LOGGER_NAME_META_KEY = 'loggerName';

export type ContextLoggerMetadata = Partial<Record<LogLevel, object>>;
export const CONTEXT_LOGGER_METADATA = createPlatformContextValueKey<ContextLoggerMetadata>(
  'AzFunctionsContext.Logger.Metadata',
);

/**
 * Log levels for the logger.
 *
 * @see LOG_LEVELS
 */
export type LogLevel = keyof typeof LOG_LEVELS;

/**
 * IoC container identifier for the default log level used by the logger.
 */
export const DEFAULT_LOG_LEVEL = serviceIdentifier<LogLevel>('AzFunctions.DefaultLogLevel');

/**
 * A logger interface that provides logging methods for different log levels.
 *
 * @example
 * ```ts
 * @Injectable()
 * class MyService {
 *   private readonly logger: Logger;
 *
 *   constructor(@Inject(LOGGER_FACTORY) loggerFactory: LoggerFactory) {
 *     this.logger = loggerFactory('MyService');
 *   }
 *
 *   doSomething() {
 *     this.logger.info('Doing something...');
 *   }
 * }
 * ```
 */
export type Logger = Pick<winston.Logger, LogLevel>;

/**
 * A prefix for all system loggers used by the AzFunctions platform. This prefix is used to identify loggers that are part of the platform's internal logging system.
 */
export const SYSTEM_LOGGER_NAME_PREFIX = '#az-functions';
export const LOGGER_PROVIDER = serviceIdentifier<LoggerProvider>('AzFunctions.LoggerProvider');

/**
 * An IoC container identifier for a service that provides log levels for loggers.
 *
 * This service can be used to determine the log level for a specific logger based on its name.
 *
 * @example
 * ```ts
 * @Injectable()
 * class MyLogLevelProvider implements LogLevelProvider {
 *   getLogLevel(loggerName?: string): LogLevel | undefined {
 *     if (loggerName?.startsWith('MyService')) {
 *       return 'debug';
 *     }
 *     return undefined;
 *   }
 * }
 * ...
 * export const LoggerModule = new ContainerModule(({ bind }) => {
 *   ...
 *   bind(LOG_LEVEL_PROVIDER).to(MyLogLevelProvider);
 *   ...
 * });
 * ...
 * startPlatform({
 *   ...
 *   modules: [
 *     ...
 *     LoggerModule,
 *     ...
 *   ],
 * });
 * ```
 */
export const LOG_LEVEL_PROVIDER = serviceIdentifier<LogLevelProvider>('AzFunctions.LogLevelProvider');

/**
 * An identifier for a logger factory function that creates a logger instance.
 *
 * @param loggerName - The name of the logger. If not provided, the logger name will be derived from the call stack.
 * @returns A logger instance.
 *
 * @example
 * ```ts
 * @Injectable()
 * class MyService {
 *   private readonly logger: Logger;
 *
 *   constructor(@Inject(LOGGER_FACTORY) loggerFactory: LoggerFactory) {
 *     this.logger = loggerFactory('MyService');
 *   }
 *
 *   doSomething() {
 *     this.logger.info('Doing something...');
 *   }
 * }
 * ```
 */
export const LOGGER_FACTORY = serviceIdentifier<LoggerFactory>('AzFunctions.LoggerFactory');

/**
 * A factory function that creates a logger instance.
 *
 * @param loggerName - The name of the logger. If not provided, the logger name will be derived from the call stack.
 * @returns A logger instance.
 */
export type LoggerFactory = (loggerName?: string) => Logger;

/**
 * A IoC container identifier for a function that provides a logger name based on the call stack.

@example
```ts
export const LoggerModule = new ContainerModule(({ bind }) => {
  ...
  bind(LOGGER_NAME_PROVIDER).toFactory(() => {
    const regexp =
      /^\s*at\s+(?:new\s+)?([A-Za-z0-9_$]+)\s+\(.*packages[\\/]examples[\\/]backend[\\/]src[\\/](.+)\/[^\\/]+:\d+:\d+\)$/;
    return (stackEntry?: string) => {
      const stackLines = stackEntry?.split('\n') ?? [];
      let callerLine = stackLines.shift();
      while (callerLine !== undefined) {
        const match = regexp.exec(callerLine.trim());
        if (match !== null) {
          return `${LOGGER_NAME_PREFIX}.${match[2]?.replace(/\//g, '.')}.${match[1]}`;
        } else {
          callerLine = stackLines.shift();
        }
      }
    };
    ...
  });
  ...

  startPlatform({
    ...
    modules: [
      ...
      LoggerModule,
      ...
    ],
  });
});
```
 */
export const LOGGER_NAME_PROVIDER = serviceIdentifier<LoggerNameProvider>('AzFunctions.LoggerNameProvider');

/**
 * A function that provides a logger name based on the call stack.
 *
 * @param stackEntry - An optional stack entry from which to derive the logger name.
 * @returns A logger name or undefined if it cannot be derived.
 */
export type LoggerNameProvider = (stackEntry?: string) => string | undefined;

/**
 * An interface for a service that provides log levels for loggers.
 *
 * This service can be used to determine the log level for a specific logger based on its name.
 *
 * @example
 * ```ts
 * @Injectable()
 * class MyLogLevelProvider implements LogLevelProvider {
 *   getLogLevel(loggerName?: string): LogLevel | undefined {
 *     if (loggerName?.startsWith('MyService')) {
 *       return 'debug';
 *     }
 *     return undefined;
 *   }
 * }
 * ```
 */
export interface LogLevelProvider {
  /**
   * Gets the log level for a specific logger based on its name.
   *
   * @param loggerName - The name of the logger for which to get the log level.
   * @returns The log level for the specified logger, or undefined if no specific log level is set and default log level should be used.
   */
  getLogLevel(loggerName?: string): LogLevel | undefined;
}

/**
 * Configuration options for OpenTelemetry (Otel) logging.
 *
 * This interface defines the configuration options required to set up OpenTelemetry logging in an application.
 * It includes the connection string for Application Insights, as well as optional service metadata such as name, instance ID, and version.
 *
 * @param applicationInsightsConnectionString - The connection string for Application Insights, used to send telemetry data.
 * @param serviceName - (Optional) The name of the service being monitored. This is used to identify the service in telemetry data.
 * @param serviceInstanceId - (Optional) A unique identifier for the specific instance of the service. This can be used to differentiate between multiple instances of the same service.
 * @param serviceVersion - (Optional) The version of the service being monitored. This can be used to track changes and updates to the service over time.
 *
 * @example
 * ```ts
 * const otelConfiguration: OtelConfiguration | undefined =
 *   process.env.APPLICATIONINSIGHTS_CONNECTION_STRING !== undefined
 *     ? {
 *         applicationInsightsConnectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
 *         serviceName: process.env.WEBSITE_DEPLOYMENT_ID,
 *         serviceVersion: '1.0.0',
 *         serviceInstanceId: process.env.WEBSITE_INSTANCE_ID,
 *       }
 *     : undefined;
 * ...
 * startPlatform({
 *   ...
 *   loggerConfiguration: {
 *     otelConfiguration,
 *   },
 * });
 * ```
 */
export interface OtelConfiguration {
  applicationInsightsConnectionString: string;
  serviceName?: string;
  serviceInstanceId?: string;
  serviceVersion?: string;
}

export interface LoggerConfiguration {
  defaultLogLevel?: LogLevel;
  otelConfiguration?: OtelConfiguration;
}

export interface PlatformLogInfo {
  level: LogLevel;
  timestamp: Date;
  message: string;
  invocationId?: string;
  traceContext?: TraceContext;
  operationName?: string;
  loggerName: string;
  metadata?: AnyValueMap;
}
