import { injectable } from 'inversify';
import {
  FUNCTION_HANDLER_METADATA,
  TriggerHandlerClass,
  TriggerHandlerMetadataError,
  TriggerHandlerMetadataReader,
} from 'shared';
import { ControllerOperationMetadata, HTTP_CONTROLLER_TYPE, HttpControllerMetadata } from './decorators';

@injectable()
export class HttpControllerMetadataReader {
  constructor(private readonly metadataReader: TriggerHandlerMetadataReader) {}

  getHandlerClassMetadata(triggerHandlerClass: TriggerHandlerClass): HttpControllerMetadata {
    const handlerClassMetadata = this.metadataReader.getHandlerClassMetadata(triggerHandlerClass);
    if (handlerClassMetadata.type !== HTTP_CONTROLLER_TYPE) {
      throw new TriggerHandlerMetadataError(
        `Invalid type for handler class ${triggerHandlerClass.name}. Expected '${HTTP_CONTROLLER_TYPE}', but got '${handlerClassMetadata.type}'.`,
        {
          cause: {
            triggerHandlerClass: triggerHandlerClass.name,
            expectedType: HTTP_CONTROLLER_TYPE,
            actualType: handlerClassMetadata.type,
            reason: 'invalid type',
          },
        },
      );
    }
    return handlerClassMetadata as HttpControllerMetadata;
  }

  getOperationMetadata(handlerClass: TriggerHandlerClass, operation: string): ControllerOperationMetadata {
    const argsMetadata = Reflect.getOwnMetadata(FUNCTION_HANDLER_METADATA, handlerClass.prototype, operation);
    if (argsMetadata === undefined) {
      throw new TriggerHandlerMetadataError(
        `No metadata found for operation ${operation} in handler class ${handlerClass.name}.`,
        {
          cause: {
            handlerClass: handlerClass.name,
            operation,
            reason: 'no metadata',
          },
        },
      );
    }
    if (argsMetadata.type !== HTTP_CONTROLLER_TYPE) {
      throw new TriggerHandlerMetadataError(
        `Invalid type for operation ${operation} in handler class ${handlerClass.name}. Expected '${HTTP_CONTROLLER_TYPE}', but got '${argsMetadata.type}'.`,
        {
          cause: {
            handlerClass: handlerClass.name,
            operation,
            expectedType: HTTP_CONTROLLER_TYPE,
            actualType: argsMetadata.type,
            reason: 'invalid type',
          },
        },
      );
    }
    return argsMetadata as ControllerOperationMetadata;
  }
}
