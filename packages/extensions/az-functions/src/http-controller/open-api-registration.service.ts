import { inject, injectable } from 'inversify';
import { LOGGER_FACTORY, LoggerFactory } from 'logger';
import { TriggerHandlerClass, TriggerHandlerMetadataReader } from 'shared';
import { RestApplication } from './http-controller.model';
import { HttpOperationsRegistrationService } from './http-operations-registration.service';
import { OpenApiDefinitionService } from './open-api-definition.service';

@injectable()
export class OpenApiRegistrationService {
  private readonly logger;

  constructor(
    private readonly metadataReader: TriggerHandlerMetadataReader,
    private readonly definitionService: OpenApiDefinitionService,
    private readonly operationRegistrationService: HttpOperationsRegistrationService,
    @inject(LOGGER_FACTORY) private readonly loggerFactory: LoggerFactory,
  ) {
    this.logger = this.loggerFactory();
  }

  register(config: { triggerHandlerClasses: TriggerHandlerClass[]; restApplications?: RestApplication[] }): void {
    const { restApplications } = config;
    const httpTriggerHandlerClasses = config.triggerHandlerClasses.filter(handlerClass => {
      const metadata = this.metadataReader.getHandlerClassMetadata(handlerClass);
      return metadata.type === 'http-controller';
    });
    this.logger.info('Registering OpenAPI definitions for Azure Functions started', {
      triggerHandlerClasses: httpTriggerHandlerClasses.length,
      restApplications: restApplications?.length || 'none',
    });
    this.logger.debug('Registering OpenAPI definitions for Azure Functions started', {
      triggerHandlerClasses: httpTriggerHandlerClasses.map(cls => cls.name),
      restApplications: restApplications?.map(app => app.name) || 'none',
    });
    for (const application of restApplications ?? []) {
      this.definitionService.addApplication(application);
    }
    for (const triggerHandlerClass of httpTriggerHandlerClasses) {
      this.operationRegistrationService.registerOperations(triggerHandlerClass, operationRegistrationData => {
        this.definitionService.registerOperation(operationRegistrationData);
      });
    }
    this.logger.info(`${httpTriggerHandlerClasses.length} OpenAPI definition(s) registered`);
  }
}
