import { injectable } from 'inversify';
import { AZURE_FUNCTION_METADATA_KEY, AzureFunction } from 'shared';
import { ComponentMetadata } from './model';

@injectable()
export class PlatformComponentMetadataService {
  getMetadata(azureFunction: AzureFunction): ComponentMetadata | undefined {
    return Reflect.getMetadata(AZURE_FUNCTION_METADATA_KEY, azureFunction) as ComponentMetadata | undefined;
  }
}
