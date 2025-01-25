import { OpenApiGeneratorV3, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { inject, injectable } from 'inversify';
import { OpenAPIObject } from 'openapi3-ts/oas30';
import { HttpControllerDefinitionError } from './http-controller-platform.model';
import { HttpOperationRegistrationData, RestApplication } from './index';
import { OpenApiMetadataService } from './open-api-metadata.service';
import { REST_OPEN_API_REGISTRY, RestOpenApiEntries, RestOpenApiEntry } from './rest-open-api.regstry';

const DEFAULT_APPLICATION = 'default';
const defaultRestApplication: RestApplication = {
  name: DEFAULT_APPLICATION,
  context: DEFAULT_APPLICATION,
  openApiConfig: {
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'unknown',
    },
  },
};

@injectable()
export class OpenApiDefinitionService {
  constructor(
    private readonly openApiMetadataService: OpenApiMetadataService,
    @inject(REST_OPEN_API_REGISTRY) private readonly restOpenApiEntries: RestOpenApiEntries
  ) {}

  getApplications(): string[] {
    return Object.keys(this.restOpenApiEntries);
  }

  getApplication(applicationName?: string): RestApplication {
    const dataEntry = this.getApiDataEntry(applicationName);
    return dataEntry.application;
  }

  getRegistry(applicationName?: string): OpenAPIRegistry {
    const dataEntry = this.getApiDataEntry(applicationName);
    return dataEntry.registry;
  }

  private getApiDataEntry(applicationName?: string): RestOpenApiEntry {
    const dataEntry =
      applicationName !== undefined ? this.restOpenApiEntries[applicationName] : this.getDefaultDataEntry();
    if (!dataEntry) {
      let errorMsg: string;
      if (applicationName) {
        errorMsg = `Unknown OpenAPI definition: ${applicationName}.`;
      } else {
        errorMsg = `OpenAPI definition is not set.`;
      }
      throw new HttpControllerDefinitionError(errorMsg);
    }
    return dataEntry;
  }

  generateDocument(applicationName: string, apiUrl?: string): OpenAPIObject {
    const { application, registry } = this.getApiDataEntry(applicationName);
    let openApiConfig = application.openApiConfig;
    if (apiUrl) {
      openApiConfig = {
        ...openApiConfig,
        servers: [
          {
            url: apiUrl + '/' + application.context,
          },
        ],
      };
    }
    const openApiGenerator = new OpenApiGeneratorV3(registry.definitions);
    return openApiGenerator.generateDocument(openApiConfig);
  }

  private getDefaultDataEntry(): RestOpenApiEntry {
    let defaultDataEntry = this.restOpenApiEntries[DEFAULT_APPLICATION];
    if (!defaultDataEntry) {
      defaultDataEntry = { application: defaultRestApplication, registry: new OpenAPIRegistry() };
      this.restOpenApiEntries[DEFAULT_APPLICATION] = defaultDataEntry;
    }
    return defaultDataEntry;
  }

  registerOperation(registrationData: HttpOperationRegistrationData) {
    const {
      operation,
      controllerMetadata,
      operationMetadata,
      application: { name: applicationName },
      route,
    } = registrationData;
    const tags = this.openApiMetadataService.getTags(controllerMetadata, operationMetadata);
    const responses = this.openApiMetadataService.getResponse(operationMetadata);
    const request = this.openApiMetadataService.getRequest(operationMetadata);
    const openAPIRegistry = this.getRegistry(applicationName);
    openAPIRegistry.registerPath({
      method: operationMetadata.method,
      operationId: operationMetadata.operationId ?? operation,
      description: operationMetadata.description,
      security: operationMetadata.security,
      summary: operationMetadata.summary,
      path: '/' + route,
      tags,
      parameters: operationMetadata.parameters,
      request,
      responses,
    });
  }
}
