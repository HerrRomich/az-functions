import { app } from '@azure/functions';
import * as fs from 'fs/promises';
import { Container, inject, injectable } from 'inversify';
import * as path from 'path';
import * as process from 'process';
import {
  AZURE_FUNCTION,
  AzureFunctionRegistrationError,
  AzureFunctions,
  PLATFORM_CONTAINER,
  PLATFORM_MODE,
  PlatformMode,
} from 'shared';
import * as YAML from 'yaml';
import { OpenApiDefinitionService, SwaggerHandlingService } from '../http-controller';
import { PlatformComponentMetadataService } from './platform-component-metadata.service';
import { REGISTER_FUNCTIONS_FACTORY, RegisterFunctionFactory } from './register-functions.factory';

@injectable()
export class AzurePlatform {
  constructor(
    @inject(PLATFORM_MODE) private readonly platformMode: PlatformMode,
    @inject(PLATFORM_CONTAINER) private readonly platformContainer: Container,
    @inject(REGISTER_FUNCTIONS_FACTORY) private readonly registerFunctionsFactory: RegisterFunctionFactory,
    private readonly swaggerHandlingService: SwaggerHandlingService,
    private readonly metadataService: PlatformComponentMetadataService,
    private readonly openApiDefinitionService: OpenApiDefinitionService
  ) {}

  async start() {
    if (this.openApiDefinitionService.getApplications().length > 0 && this.platformMode === 'start') {
      this.registerSwaggerUi();
    }
    const azureFunctions = this.platformContainer.isBound(AZURE_FUNCTION)
      ? await this.platformContainer.getAllAsync<AzureFunctions>(AZURE_FUNCTION)
      : [];
    azureFunctions.forEach((azureFunction) => this.registerFunctions(azureFunction));
    if (this.platformMode === 'print-open-api') {
      await this.printOpenApi();
    }
  }

  private registerSwaggerUi() {
    app.get('swaggerUi', {
      route: 'spec',
      handler: (request) => this.swaggerHandlingService.handleSwaggerUi(request),
    });
    app.get('swaggerUiFile', {
      route: 'spec/{fileName}',
      handler: async (request) => await this.swaggerHandlingService.handleSwaggerContent(request),
    });
    app.get('openApiDefinition', {
      route: 'spec/definition/{definitionName}',
      handler: (request) => this.swaggerHandlingService.handleOpenApiDefinition(request),
    });
  }

  private registerFunctions(azureFunctions: AzureFunctions) {
    const metadata = this.metadataService.getMetadata(azureFunctions);
    const triggerType = metadata?.type;
    if (!triggerType) {
      throw new AzureFunctionRegistrationError(`Unmanageable azure trigger: ${azureFunctions.constructor.name}`);
    }
    this.registerFunctionsFactory(triggerType).register(azureFunctions, metadata);
  }

  private async printOpenApi() {
    const printPath = process.env.OPEN_API_PRINT_PATH ?? path.resolve(process.cwd(), 'dist/open-api-definitions');
    try {
      await fs.stat(printPath);
    } catch (e: unknown) {
      await fs.mkdir(printPath);
    }
    for (const application of this.openApiDefinitionService.getApplications()) {
      try {
        const definition = this.openApiDefinitionService.generateDocument(application);
        let filePath = path.resolve(printPath, `${application}-api.json`);
        await fs.writeFile(filePath, JSON.stringify(definition, null, 2));
        filePath = path.resolve(printPath, `${application}-api.yaml`);
        await fs.writeFile(filePath, YAML.stringify(definition));
      } catch (e: unknown) {
        if (e instanceof Error) {
          console.error(e.stack);
        }
      }
    }
  }
}
