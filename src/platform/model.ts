import { EventHubHandlersMetadata } from '../event-hub-handler';
import { ControllerMetadata } from '../http-controller';
import { AzureFunctions } from '../shared/platform.model';

export type ComponentMetadata = ControllerMetadata | EventHubHandlersMetadata;

export interface FunctionsRegistrationService {
  register(functions: AzureFunctions, functionsMetadata: ComponentMetadata): void;
}
