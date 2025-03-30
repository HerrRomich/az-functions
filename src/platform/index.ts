import { app } from '@azure/functions';
import { Container } from 'inversify';
import * as process from 'process';
import {
  PLATFORM_CONTAINER,
  PLATFORM_MODE,
  PlatformContextLocalStorage,
  PlatformMode,
  sharedModule,
  SYSTEM_USER_ACCOUNT,
  systemUserAccount,
} from 'shared';
import { createLogger, format, Logger, transports } from 'winston';
import { eventHubHandlersModule } from '../event-hub-handler';
import { httpControllerModule } from '../http-controller';
import { AzurePlatform } from './azure-platform';
import { AzureLogTransporter, LOGGER_SETTINGS, LoggerSettings } from './logger';
import { PlatformComponentMetadataService } from './platform-component-metadata.service';
import {
  REGISTER_FUNCTIONS_FACTORY,
  RegisterFunctionFactory,
  registerFunctionsFactory,
} from './register-functions.factory';
import { SecurityContext } from './security-context';
import { STARTUP_SERVICE, StartupService } from './startup.service';
import combine = format.combine;
import colorize = format.colorize;
import errors = format.errors;
import json = format.json;

export * from '../http-controller/security';
export * from './model';
export { SecurityContext } from './security-context';
export * from './startup.service';

export * from '../event-hub-handler';
export * from '../http-controller';
export { LOGGER_SETTINGS, LoggerSettings } from './logger';

export const platform = async (platformContainer: Container) => {
  const systemContainer = new Container({
    defaultScope: 'Singleton',
  });

  systemContainer.bind(AzurePlatform).toSelf();
  platformContainer
    .bind(Logger)
    .toDynamicValue(context => {
      const loggerSettings = context.get<LoggerSettings>(LOGGER_SETTINGS, { optional: true });
      const contextStorage = context.get(PlatformContextLocalStorage);
      return createLogger({
        ...loggerSettings,
        levels: {
          error: 0,
          warn: 1,
          info: 2,
          debug: 3,
          trace: 4,
        },
        transports: [new transports.Console(), new AzureLogTransporter(contextStorage)],
        format: combine(colorize(), errors({ stack: true }), json()),
      });
    })
    .inSingletonScope();
  platformContainer.bind(SecurityContext).toSelf().inSingletonScope();
  platformContainer.bind(SYSTEM_USER_ACCOUNT).toConstantValue(systemUserAccount);
  platformContainer.bind(PlatformContextLocalStorage).toSelf().inSingletonScope();
  systemContainer.bind(PlatformComponentMetadataService).toSelf();
  const platformMode = process.env.PLATFORM_MODE === 'print-open-api' ? 'print-open-api' : 'start';
  systemContainer.bind(PLATFORM_CONTAINER).toConstantValue(platformContainer);
  systemContainer.bind<PlatformMode>(PLATFORM_MODE).toConstantValue(platformMode);
  systemContainer
    .bind<RegisterFunctionFactory>(REGISTER_FUNCTIONS_FACTORY)
    .toFactory(context => registerFunctionsFactory(context));
  await systemContainer.load(sharedModule, httpControllerModule, eventHubHandlersModule);
  const azurePlatform = await systemContainer.getAsync(AzurePlatform);
  const startupService = platformContainer.get<StartupService>(STARTUP_SERVICE, { optional: true });
  if (platformMode === 'start' && startupService !== undefined) {
    app.hook.appStart(async () => {
      await startupService.startup();
    });
  }
  await azurePlatform.start();
};
