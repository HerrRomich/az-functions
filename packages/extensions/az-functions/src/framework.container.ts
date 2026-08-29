import { EventHubHandlersModule } from 'event-hub-handler';
import { HttpControllerModule } from 'http-controller';
import { Container } from 'inversify';
import { LOGGER_FACTORY, LoggerConfiguration } from 'logger';
import { PlatformModule } from 'platform';
import { PLATFORM_CONTAINER, SharedModule } from 'shared';
import * as winston from 'winston';
import { bindLoggerFactory } from './logger/bindings';
import { providePlatformContainer } from './platform.container';

export function createContainers(loggerConfiguration?: LoggerConfiguration): {
  frameworkContainer: Container;
  platformContainer: Container;
} {
  const frameworkContainer = new Container({
    defaultScope: 'Singleton',
  });
  frameworkContainer.loadSync(SharedModule, PlatformModule, HttpControllerModule, EventHubHandlersModule);
  const platformContainer = providePlatformContainer(loggerConfiguration);
  frameworkContainer.bind(PLATFORM_CONTAINER).toConstantValue(platformContainer);
  frameworkContainer.bind(winston.Logger).toDynamicValue(() => platformContainer.get(winston.Logger));
  frameworkContainer.bind(LOGGER_FACTORY).toDynamicValue(context => bindLoggerFactory(context));
  return { frameworkContainer, platformContainer };
}
