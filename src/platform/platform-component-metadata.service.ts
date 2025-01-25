import { injectable } from 'inversify';
import { AZURE_FUNCTION_METADATA_KEY, AzureFunctions } from 'shared';
import { ComponentMetadata } from './model';

@injectable()
export class PlatformComponentMetadataService {
  getMetadata(azureFunction: AzureFunctions): ComponentMetadata | undefined {
    return Reflect.getMetadata(AZURE_FUNCTION_METADATA_KEY, azureFunction.constructor) as ComponentMetadata | undefined;
  }
}
