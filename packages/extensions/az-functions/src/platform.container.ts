import {
  BasePlatformContextManager,
  PLATFORM_CONTEXT_MANAGER,
  PLATFORM_CONTEXT_PROVIDER,
  PlatformExecutionContextProvider,
} from 'context';
import { Container } from 'inversify';
import { LoggerConfiguration, provideLoggerModule } from 'logger';
import { SecurityContext } from 'security';

export function providePlatformContainer(loggerConfiguration: LoggerConfiguration | undefined) {
  const platformContainer = new Container({
    defaultScope: 'Singleton',
  });
  platformContainer.bind(PLATFORM_CONTEXT_MANAGER).to(BasePlatformContextManager);
  platformContainer.loadSync(provideLoggerModule(loggerConfiguration));
  platformContainer.get(PLATFORM_CONTEXT_MANAGER);
  platformContainer.bind(SecurityContext).toSelf();
  platformContainer.bind(PLATFORM_CONTEXT_PROVIDER).to(PlatformExecutionContextProvider);
  return platformContainer;
}
