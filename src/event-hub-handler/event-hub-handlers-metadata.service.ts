import { injectable } from 'inversify';
import { AzureFunctions } from 'shared';
import { EVENT_HUB_HANDLER_METADATA_KEY, EventHubHandlerMetadata } from './decorators';

@injectable()
export class EventHubHandlersMetadataService {
  getOperationMetadata(azureFunction: AzureFunctions, operation: string): EventHubHandlerMetadata | undefined {
    return Reflect.getOwnMetadata(EVENT_HUB_HANDLER_METADATA_KEY, azureFunction.constructor.prototype, operation) as
      | EventHubHandlerMetadata
      | undefined;
  }
}
