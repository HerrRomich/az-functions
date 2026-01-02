import { injectable } from 'inversify';
import { AzureFunction } from 'shared';
import { EVENT_HUB_HANDLE_METHOD_METADATA_KEY, EventHubHandleMethodArgsMetadata } from './decorators';
import { HANDLE_METHOD_NAME } from './event-hub-handler.model';

@injectable()
export class EventHubHandleMethodArgsMetadataService {
  getMethodArgsMetadata(azureFunction: AzureFunction): EventHubHandleMethodArgsMetadata | undefined {
    return Reflect.getOwnMetadata(
      EVENT_HUB_HANDLE_METHOD_METADATA_KEY,
      azureFunction.constructor.prototype,
      HANDLE_METHOD_NAME,
    ) as EventHubHandleMethodArgsMetadata | undefined;
  }
}
