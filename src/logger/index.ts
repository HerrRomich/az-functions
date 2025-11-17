import * as appInsights from 'applicationinsights';
import { ContainerModule } from 'inversify';
import * as winston from 'winston';
import { AzureLogTransport } from './azure-log-transport.service';
import { CLOUD_ROLE, LOG_CATEGORY_PROVIDER, LOG_LEVELS, LOGGER_FACTORY } from './logger.model';
import { PlatformLogger } from './platform.logger';

export { ILogLevelService, LOG_LEVEL_SERVICE } from './log-level.service';
export { LOG_CATEGORY_PROVIDER, LOG_LEVELS, Logger, LOGGER_FACTORY, LoggerFactory, LogLevel } from './logger.model';

export const loggerModule = new ContainerModule(options => {
  options.bind(AzureLogTransport).toSelf().inSingletonScope();
  options
    .bind(winston.Logger)
    .toDynamicValue(context => {
      const transport = context.get(AzureLogTransport);
      return winston.createLogger({
        level: 'verbose',
        levels: LOG_LEVELS,
        format: winston.format.splat(),
        transports: [transport],
      });
    })
    .inSingletonScope();
  options.bind(LOGGER_FACTORY).toFactory(context => {
    const logger = context.get(winston.Logger);
    const logCategoryProvider = context.get(LOG_CATEGORY_PROVIDER, { optional: true });
    return (category?: string) => {
      if (category === undefined) {
        category = logCategoryProvider?.();
      }
      return logger.child({ category });
    };
  });

  options.bind(PlatformLogger).toSelf().inSingletonScope();
  if (process.env.WEBSITE_INSTANCE_ID !== undefined) {
    options
      .bind(appInsights.TelemetryClient)
      .toDynamicValue(() => {
        appInsights.setup();
        appInsights.defaultClient.context.tags[appInsights.defaultClient.context.keys.cloudRole] = CLOUD_ROLE;
        appInsights.start();
        return appInsights.defaultClient;
      })
      .inSingletonScope();
  }
});
