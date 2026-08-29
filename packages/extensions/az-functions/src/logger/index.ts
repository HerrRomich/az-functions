import { ContainerModule } from 'inversify';
import * as winston from 'winston';
import { bindLoggerFactory, bindOtelLoggerProvider, bindWinstonLogger } from './bindings';
import { LogLevelService } from './log-level.service';
import { AzFunctionsTransport } from './log-transport.service';
import { DEFAULT_LOG_LEVEL, LOGGER_FACTORY, LOGGER_PROVIDER, LoggerConfiguration } from './logger.model';
import { OtelLogger } from './otel.logger';

export * from './logger.model';
export * from './logger.utils';
export * from './trie-search.service';

export function provideLoggerModule(loggerConfiguration?: LoggerConfiguration): ContainerModule {
  return new ContainerModule(options => {
    options.bind(LogLevelService).toSelf();
    options.bind(AzFunctionsTransport).toSelf();
    options.bind(winston.Logger).toDynamicValue(context => bindWinstonLogger(context));
    options.bind(LOGGER_FACTORY).toFactory(context => bindLoggerFactory(context));
    options.bind(DEFAULT_LOG_LEVEL).toConstantValue(loggerConfiguration?.defaultLogLevel ?? 'info');
    if (loggerConfiguration?.otelConfiguration !== undefined) {
      const otelConfiguration = loggerConfiguration.otelConfiguration;
      options.bind(OtelLogger).toSelf();
      options.bind(LOGGER_PROVIDER).toDynamicValue(() => bindOtelLoggerProvider(otelConfiguration));
    }
  });
}
