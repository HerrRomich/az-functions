import { Container } from 'inversify';
import { PLATFORM_CONTAINER, PLATFORM_MODE, PlatformContextLocalStorage, PlatformMode, sharedModule } from 'shared';
import { eventHubHandlersModule } from '../event-hub-handler';
import { httpControllerModule } from '../http-controller';
import { loggerModule } from '../logger';
import { AzurePlatform } from './azure-platform';
import { PlatformComponentMetadataService } from './platform-component-metadata.service';
import { REGISTER_FUNCTION_FACTORY, registerFunctionFactory } from './register-function.factory';
import { SecurityContext } from './security-context';

export function extendPlatformContainer(platformContainer: Container) {
  platformContainer.bind(SecurityContext).toSelf().inSingletonScope();
  platformContainer.bind(PlatformContextLocalStorage).toSelf().inSingletonScope();
  platformContainer.loadSync(loggerModule);
}

export function getSystemContainer(platformContainer: Container, platformMode: PlatformMode): Container {
  const systemContainer = new Container({
    defaultScope: 'Singleton',
  });
  systemContainer.bind(AzurePlatform).toSelf();
  systemContainer.bind(PlatformComponentMetadataService).toSelf();
  systemContainer.bind(PLATFORM_CONTAINER).toConstantValue(platformContainer);
  systemContainer.bind<PlatformMode>(PLATFORM_MODE).toConstantValue(platformMode);
  systemContainer.bind(REGISTER_FUNCTION_FACTORY).toFactory(context => registerFunctionFactory(context));
  systemContainer.loadSync(sharedModule, httpControllerModule, eventHubHandlersModule, loggerModule);
  return systemContainer;
}
