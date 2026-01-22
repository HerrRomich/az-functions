import { injectable } from 'inversify';
import {
  AzFunctionsSystemError,
  FUNCTION_HANDLER_METADATA,
  TriggerHandlerClass,
  TriggerHandlerClassMetadata,
} from './platform.model';

export class TriggerHandlerMetadataError extends AzFunctionsSystemError {}

@injectable()
export class TriggerHandlerMetadataReader {
  getHandlerClassMetadata(triggerHandlerClass: TriggerHandlerClass): TriggerHandlerClassMetadata {
    const metadata = Reflect.getMetadata(FUNCTION_HANDLER_METADATA, triggerHandlerClass);
    if (metadata === undefined) {
      throw new TriggerHandlerMetadataError(
        `No trigger handler metadata found for triggerHandlerClass=${triggerHandlerClass.name}`,
        {
          details: {
            triggerHandlerClassName: triggerHandlerClass.name,
          },
        },
      );
    }
    return metadata as TriggerHandlerClassMetadata;
  }
}
