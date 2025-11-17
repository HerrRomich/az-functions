import { app } from '@azure/functions';
import { Container } from 'inversify';
import * as process from 'node:process';
import { PLATFORM_CONTAINER, PLATFORM_MODE, PlatformContextLocalStorage, PlatformMode, sharedModule } from 'shared';
import { eventHubHandlersModule } from '../event-hub-handler';
import { httpControllerModule } from '../http-controller';
import { loggerModule } from '../logger';
import { AzurePlatform } from './azure-platform';
import { PlatformComponentMetadataService } from './platform-component-metadata.service';
import { REGISTER_FUNCTION_FACTORY, registerFunctionFactory } from './register-function.factory';
import { SecurityContext } from './security-context';
import { STARTUP_SERVICE, StartupService } from './startup.service';

export * from '../http-controller/security';
export * from './model';
export { SecurityContext } from './security-context';
export * from './startup.service';

export * from '../event-hub-handler';
export * from '../http-controller';

export const platform = async (platformContainer: Container) => {
  const systemContainer = new Container({
    defaultScope: 'Singleton',
  });

  systemContainer.bind(AzurePlatform).toSelf().inSingletonScope();
  platformContainer.bind(SecurityContext).toSelf().inSingletonScope();
  platformContainer.bind(PlatformContextLocalStorage).toSelf().inSingletonScope();
  platformContainer.loadSync(loggerModule);
  systemContainer.bind(PlatformComponentMetadataService).toSelf().inSingletonScope();
  const platformMode = process.env.PLATFORM_MODE === 'print-open-api' ? 'print-open-api' : 'start';
  systemContainer.bind(PLATFORM_CONTAINER).toConstantValue(platformContainer);
  systemContainer.bind<PlatformMode>(PLATFORM_MODE).toConstantValue(platformMode);
  systemContainer.bind(REGISTER_FUNCTION_FACTORY).toFactory(context => registerFunctionFactory(context));
  await systemContainer.load(sharedModule, httpControllerModule, eventHubHandlersModule, loggerModule);
  const azurePlatform = await systemContainer.getAsync(AzurePlatform);
  const startupService = platformContainer.get<StartupService>(STARTUP_SERVICE, { optional: true });
  if (platformMode === 'start' && startupService !== undefined) {
    app.hook.appStart(async () => {
      await startupService.startup();
    });
  }
  await azurePlatform.start();
};
