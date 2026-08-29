import { app } from '@azure/functions';
import { SwaggerHandlingService } from 'http-controller';
import { Container, inject, injectable } from 'inversify';
import { LOGGER_FACTORY, LoggerFactory } from 'logger';
import { PLATFORM_CONTAINER, TriggerHandlerClass } from 'shared';
import { REGISTER_TRIGGER_HANDLER_FACTORY, RegisterTriggerHandlerFactory } from './register-trigger-handler.factory';
import { STARTUP_SERVICE } from './startup.service';

@injectable()
export class AzurePlatform {
  private readonly logger;

  constructor(
    @inject(LOGGER_FACTORY) loggerFactory: LoggerFactory,
    @inject(PLATFORM_CONTAINER) private readonly platformContainer: Container,
    @inject(REGISTER_TRIGGER_HANDLER_FACTORY) private readonly registerHandler: RegisterTriggerHandlerFactory,
    private readonly swaggerHandlingService: SwaggerHandlingService,
  ) {
    this.logger = loggerFactory();
  }

  start(triggerHandlerClasses: TriggerHandlerClass[]) {
    this.logger.info('Starting Azure platform');
    this.registerStartupService();
    this.registerSwaggerUi();
    triggerHandlerClasses.forEach(azureFunctionType => {
      this.registerHandler(azureFunctionType);
    });
    this.logger.info('Azure platform started');
  }

  private registerStartupService(): void {
    this.logger.info('Registering startup service');
    const startupService = this.platformContainer.get(STARTUP_SERVICE, { optional: true });
    if (startupService !== undefined) {
      app.hook.appStart(async () => {
        await startupService.startup();
      });
      this.logger.info('Startup service registered');
    } else {
      this.logger.info('No startup service found');
    }
  }

  private registerSwaggerUi() {
    this.logger.info('Registering Swagger UI endpoints');
    app.get('swaggerUi', {
      route: 'spec/{fileName?}',
      handler: async request => await this.swaggerHandlingService.handleSwaggerContent(request),
    });
    app.get('openApiDefinition', {
      route: 'spec/definition/{definitionName}',
      handler: request => this.swaggerHandlingService.handleOpenApiDefinition(request),
    });
    this.logger.info('Swagger UI endpoints registered');
  }
}
