import { Factory, ResolutionContext } from 'inversify';
import { EventHubHandlerRegistrationService } from '../event-hub-handler/event-hub-handler-registration.service';
import { HttpControllerRegistrationService } from '../http-controller';
import { ComponentMetadata, FunctionsRegistrationService } from './model';

export const REGISTER_FUNCTIONS_FACTORY = Symbol.for('REGISTER_FUNCTIONS_FACTORY');

export type RegisterFunctionFactory = Factory<FunctionsRegistrationService, [functionsType: ComponentMetadata['type']]>;

export function registerFunctionsFactory(context: ResolutionContext): RegisterFunctionFactory {
  return (functionsType: ComponentMetadata['type']): FunctionsRegistrationService => {
    switch (functionsType) {
      case 'http-controller':
        return context.get(HttpControllerRegistrationService);
      case 'event-hub-handler':
        return context.get(EventHubHandlerRegistrationService);
    }
  };
}
