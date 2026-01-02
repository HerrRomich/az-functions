import { AzureFunction } from 'shared';
import { EventHubHandlerMetadata } from '../event-hub-handler';
import { ControllerMetadata } from '../http-controller';

export type ComponentMetadata = ControllerMetadata | EventHubHandlerMetadata;

export interface FunctionsRegistrationService {
  register(functions: AzureFunction, functionsMetadata: ComponentMetadata): void;
}
