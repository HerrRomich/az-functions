import { interfaces } from 'inversify';
import { EventHubHandlersRegistrationService } from '../event-hub-handler/event-hub-handlers-registration.service';
import { HttpControllerRegistrationService } from '../http-controller';
import { ComponentMetadata, FunctionsRegistrationService } from './model';

export const REGISTER_FUNCTIONS_FACTORY = Symbol.for('REGISTER_FUNCTIONS_FACTORY');

export type RegisterFunctionFactory = interfaces.SimpleFactory<
  FunctionsRegistrationService,
  [functionsType: ComponentMetadata['type']]
>;

export function registerFunctionsFactory(context: interfaces.Context): RegisterFunctionFactory {
  return (functionsType: ComponentMetadata['type']): FunctionsRegistrationService => {
    switch (functionsType) {
      case 'http-controller':
        return context.container.get(HttpControllerRegistrationService);
      case 'event-hub-handlers':
        return context.container.get(EventHubHandlersRegistrationService);
    }
  };
}
