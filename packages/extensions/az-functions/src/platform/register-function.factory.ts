import { ResolutionContext, ServiceIdentifier } from 'inversify';
import { EventHubHandlerRegistrationService } from '../event-hub-handler/event-hub-handler-registration.service';
import { HttpControllerRegistrationService } from '../http-controller';
import { ComponentMetadata, FunctionsRegistrationService } from './model';

export const REGISTER_FUNCTION_FACTORY: ServiceIdentifier<RegisterFunctionFactory> =
  Symbol.for('REGISTER_FUNCTION_FACTORY');

export type RegisterFunctionFactory = (functionsType: ComponentMetadata['type']) => FunctionsRegistrationService;

export function registerFunctionFactory(context: ResolutionContext): RegisterFunctionFactory {
  return (functionsType: ComponentMetadata['type']): FunctionsRegistrationService => {
    switch (functionsType) {
      case 'http-controller':
        return context.get(HttpControllerRegistrationService);
      case 'event-hub-handler':
        return context.get(EventHubHandlerRegistrationService);
    }
  };
}
