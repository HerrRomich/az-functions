import { EventHubHandlerMetadata } from '../event-hub-handler';
import { ControllerMetadata } from '../http-controller';
import { AzureFunctions } from 'shared';

export type ComponentMetadata = ControllerMetadata | EventHubHandlerMetadata;

export interface FunctionsRegistrationService {
  register(functions: AzureFunctions, functionsMetadata: ComponentMetadata): void;
}
