import { injectable } from 'inversify';
import {
  FUNCTION_HANDLER_METADATA,
  TriggerHandlerClass,
  TriggerHandlerMetadataError,
  TriggerHandlerMetadataReader,
} from 'shared';
import { EVENT_HUB_HANDLER_TYPE, EventHubHandlerMetadata, EventHubTriggerMetadata } from './decorators';

@injectable()
export class EventHubHandlerMetadataReader {
  constructor(private readonly metadataReader: TriggerHandlerMetadataReader) {}

  getHandlerClassMetadata(azureFunction: TriggerHandlerClass): EventHubHandlerMetadata {
    const handlerClassMetadata = this.metadataReader.getHandlerClassMetadata(azureFunction);
    if (handlerClassMetadata.type !== EVENT_HUB_HANDLER_TYPE) {
      throw new TriggerHandlerMetadataError(
        `Invalid type for handler class ${azureFunction.name}. Expected '${EVENT_HUB_HANDLER_TYPE}', but got '${handlerClassMetadata.type}'.`,
      );
    }
    return handlerClassMetadata as EventHubHandlerMetadata;
  }

  getTriggerMetadata(azureFunction: TriggerHandlerClass, operation: string): EventHubTriggerMetadata {
    const argsMetadata = Reflect.getOwnMetadata(FUNCTION_HANDLER_METADATA, azureFunction.prototype, operation);
    if (argsMetadata === undefined) {
      throw new TriggerHandlerMetadataError(
        `No metadata found for operation ${operation} in handler class ${azureFunction.name}.`,
      );
    }
    if (argsMetadata.type !== EVENT_HUB_HANDLER_TYPE) {
      throw new TriggerHandlerMetadataError(
        `Invalid type for operation ${operation} in handler class ${azureFunction.name}. Expected '${EVENT_HUB_HANDLER_TYPE}', but got '${argsMetadata.type}'.`,
      );
    }
    return argsMetadata as EventHubTriggerMetadata;
  }
}
