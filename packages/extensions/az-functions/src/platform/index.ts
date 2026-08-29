import { ContainerModule } from 'inversify';
import { LOGGER_NAME_PROVIDER } from 'logger';
import { AzurePlatform } from './azure-platform';
import {
  REGISTER_TRIGGER_HANDLER_FACTORY,
  bindRegisterTriggerHandlerFactory,
} from './register-trigger-handler.factory';
import { systemLoggerNameProvider } from './system-logger-name.provider';

export * from './azure-platform';
export * from './model';
export { IStartupService, STARTUP_SERVICE } from './startup.service';

export const PlatformModule = new ContainerModule(options => {
  options.bind(AzurePlatform).toSelf();
  options.bind(REGISTER_TRIGGER_HANDLER_FACTORY).toFactory(bindRegisterTriggerHandlerFactory);
  options.bind(LOGGER_NAME_PROVIDER).toFactory(() => systemLoggerNameProvider);
});
