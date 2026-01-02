import { injectable } from 'inversify';
import { AzureFunction } from 'shared';
import { ControllerOperationMetadata, HTTP_OPERATION_METADATA_KEY } from './decorators';

@injectable()
export class HttpControllerMetadataService {
  getOperationMetadata(azureFunction: AzureFunction, operation: string): ControllerOperationMetadata | undefined {
    return Reflect.getOwnMetadata(HTTP_OPERATION_METADATA_KEY, azureFunction.constructor.prototype, operation) as
      | ControllerOperationMetadata
      | undefined;
  }
}
