import { AzureMonitorLogExporter } from '@azure/monitor-opentelemetry-exporter';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs';
import { ATTR_SERVICE_INSTANCE_ID, ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { ResolutionContext } from 'inversify';
import * as winston from 'winston';
import { AzFunctionsTransport } from './log-transport.service';
import {
  LOG_LEVELS,
  Logger,
  LOGGER_NAME_META_KEY,
  LOGGER_NAME_PROVIDER,
  LoggerFactory,
  OtelConfiguration,
} from './logger.model';

export function bindWinstonLogger(context: ResolutionContext): winston.Logger {
  const transport = context.get(AzFunctionsTransport);
  return winston.createLogger({
    level: 'silly',
    levels: LOG_LEVELS,
    format: winston.format.combine(winston.format.timestamp(), winston.format.splat(), winston.format.metadata()),
    transports: [transport],
  });
}

export function bindLoggerFactory(context: ResolutionContext): LoggerFactory {
  const logger = context.get(winston.Logger);
  const loggerNameProvider = context.get(LOGGER_NAME_PROVIDER, { optional: true });
  return (loggerName?: string): Logger => {
    let derivedLoggerName = loggerName;
    if (loggerName !== undefined) {
      return logger.child({ loggerName });
    }
    if (loggerNameProvider !== undefined) {
      const obj = {};
      Error.captureStackTrace(obj);
      const stack = (obj as { stack?: string }).stack;
      const stackEntry = stack?.split('\n')[2];
      derivedLoggerName = loggerNameProvider(stackEntry);
    }
    return logger.child({ [LOGGER_NAME_META_KEY]: derivedLoggerName ?? '' });
  };
}

export function bindOtelLoggerProvider(otelConfiguration: OtelConfiguration): LoggerProvider {
  const connectionString = otelConfiguration?.applicationInsightsConnectionString;
  return new LoggerProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: otelConfiguration?.serviceName,
      [ATTR_SERVICE_INSTANCE_ID]: otelConfiguration?.serviceInstanceId,
      [ATTR_SERVICE_VERSION]: otelConfiguration?.serviceVersion,
    }),
    processors: [new BatchLogRecordProcessor(new AzureMonitorLogExporter({ connectionString }))],
  });
}
