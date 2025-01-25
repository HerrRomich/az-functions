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
import { eventHubHandlersModule } from '../event-hub-handler';
import { httpControllerModule } from '../http-controller';
import { AzurePlatform } from './azure-platform';
import { Logger } from './logger';
import { PlatformComponentMetadataService } from './platform-component-metadata.service';
import { REGISTER_FUNCTIONS_FACTORY, registerFunctionsFactory } from './register-functions.factory';
import { SecurityContext } from './security-context';
import { STARTUP_SERVICE, StartupService } from './startup.service';

export * from '../http-controller/security';
export { Logger } from './logger';
export * from './model';
export { SecurityContext } from './security-context';
export * from './startup.service';

export * from '../event-hub-handler';
export * from '../http-controller';

export const platform = async (platformContainer: Container) => {
  const systemContainer = new Container({
    defaultScope: 'Singleton',
    skipBaseClassChecks: true,
  });
  systemContainer.bind(AzurePlatform).toSelf();
  const bindingToSyntax = platformContainer.bind(Logger);
  const bindingInWhenOnSyntax = bindingToSyntax.toSelf();
  bindingInWhenOnSyntax.inSingletonScope();
  platformContainer.bind(SecurityContext).toSelf().inSingletonScope();
  platformContainer.bind(SYSTEM_USER_ACCOUNT).toConstantValue(systemUserAccount);
  platformContainer.bind(PlatformContextLocalStorage).toSelf().inSingletonScope();
  systemContainer.bind(PlatformComponentMetadataService).toSelf();
  const platformMode = process.env.PLATFORM_MODE === 'print-open-api' ? 'print-open-api' : 'start';
  systemContainer.bind(PLATFORM_CONTAINER).toConstantValue(platformContainer);
  systemContainer.bind<PlatformMode>(PLATFORM_MODE).toConstantValue(platformMode);
  systemContainer.bind(REGISTER_FUNCTIONS_FACTORY).toFactory((context) => registerFunctionsFactory(context));
  systemContainer.load(sharedModule);
  systemContainer.load(httpControllerModule);
  systemContainer.load(eventHubHandlersModule);
  const azurePlatform = await systemContainer.getAsync(AzurePlatform);
  if (platformMode === 'start' && platformContainer.isBound(STARTUP_SERVICE)) {
    const startupService: StartupService = platformContainer.get(STARTUP_SERVICE);
    app.hook.appStart(async () => {
      await startupService.startup();
    });
  }
  await azurePlatform.start();
};
