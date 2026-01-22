import { OpenApiGeneratorV3, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { ComponentTypeKey } from '@asteasolutions/zod-to-openapi/dist/openapi-registry';
import { inject, injectable } from 'inversify';
import { LOGGER_FACTORY, LoggerFactory } from 'logger';
import { ComponentsObject, OpenAPIObject } from 'openapi3-ts/oas30';
import { AzFunctionsSystemError } from 'shared';
import { RestApplication } from './http-controller.model';
import { HttpOperationRegistration } from './http-operations-registration.service';
import { OpenApiMetadataService } from './open-api-metadata.service';

export interface RestOpenApiEntry {
  application: RestApplication;
  registry: OpenAPIRegistry;
}
export type RestOpenApiEntries = Record<string, RestOpenApiEntry>;

export class OpenApiDefinitionError extends AzFunctionsSystemError {}

const DEFAULT_APPLICATION = 'default';
const defaultRestApplication: RestApplication = {
  name: DEFAULT_APPLICATION,
  context: DEFAULT_APPLICATION,
  openApiConfig: {
    openapi: '3.0.1',
    info: {
      version: '1.0.0',
      title: 'unknown',
    },
  },
};

@injectable()
export class OpenApiDefinitionService {
  private readonly logger;
  private readonly restOpenApiEntries: RestOpenApiEntries = {};

  constructor(
    @inject(LOGGER_FACTORY) private readonly loggerFactory: LoggerFactory,
    private readonly openApiMetadataService: OpenApiMetadataService,
  ) {
    this.logger = this.loggerFactory();
  }

  addApplication(application: RestApplication) {
    if (this.restOpenApiEntries[application.name]) {
      throw new OpenApiDefinitionError(`OpenAPI definition for application ${application.name} already exists`);
    }
    const registry = new OpenAPIRegistry();
    const components = application.openApiConfig.components ?? {};
    for (const [componentType, component] of Object.entries(components) as [
      ComponentTypeKey,
      ComponentsObject[ComponentTypeKey],
    ][]) {
      for (const [name, componentEntry] of Object.entries(component)) {
        registry.registerComponent(componentType, name, componentEntry);
      }
    }
    this.restOpenApiEntries[application.name] = { application, registry };
    this.logger.debug(`OpenAPI definition for application ${application.name} added`);
  }

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
      applicationName === undefined ? this.getDefaultDataEntry() : this.restOpenApiEntries[applicationName];
    if (dataEntry === undefined) {
      throw new OpenApiDefinitionError(`Unknown OpenAPI definition for application ${applicationName}`);
    }
    return dataEntry;
  }

  generateDocument(applicationName: string, apiUrl?: string): OpenAPIObject {
    const { application, registry } = this.getApiDataEntry(applicationName);
    let openApiConfig = application.openApiConfig;
    if (apiUrl !== undefined) {
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
    if (defaultDataEntry === undefined) {
      defaultDataEntry = { application: defaultRestApplication, registry: new OpenAPIRegistry() };
      this.restOpenApiEntries[DEFAULT_APPLICATION] = defaultDataEntry;
    }
    return defaultDataEntry;
  }

  registerOperation(operationRegistration: HttpOperationRegistration) {
    const {
      operationId,
      controllerMetadata,
      operationMetadata,
      application: { name: applicationName },
      route,
    } = operationRegistration;
    this.logger.debug('Registering OpenAPI operation', {
      operationRegistration,
    });
    const tags = this.openApiMetadataService.getTags(controllerMetadata, operationMetadata);
    const request = this.openApiMetadataService.getRequest(operationMetadata);
    const responses = this.openApiMetadataService.getResponses(operationMetadata);
    const openAPIRegistry = this.getRegistry(applicationName);
    this.logger.silly('Registering OpenAPI operation', {
      operationId,
      applicationName,
      route,
      method: operationMetadata.method,
      description: operationMetadata.description,
      security: operationMetadata.security,
      summary: operationMetadata.summary,
      tags,
      parameters: operationMetadata.parameters,
      request,
      responses,
    });
    openAPIRegistry.registerPath({
      method: operationMetadata.method,
      operationId,
      description: operationMetadata.description,
      security: operationMetadata.security,
      summary: operationMetadata.summary,
      path: '/' + route,
      tags,
      parameters: operationMetadata.parameters,
      request,
      responses,
    });
    this.logger.debug('Registered OpenAPI operation', {
      operationRegistration,
    });
  }
}
