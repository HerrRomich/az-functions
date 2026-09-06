import { inject, injectable } from 'inversify';
import { LOGGER_FACTORY, LoggerFactory } from 'logger';
import { TriggerHandlerClass, TriggerHandlerMetadataError } from 'shared';
import { ControllerOperationMetadata, HttpControllerMetadata, HttpControllerMetadataReader } from './decorators';
import { assertOpenApiConsistentPath, joinPosix, RestApplication } from './http-controller.model';
import { OpenApiDefinitionError, OpenApiDefinitionService } from './open-api-definition.service';

export interface HttpOperationRegistration {
  operationId: string;
  controllerMethod: string;
  controllerMetadata: HttpControllerMetadata;
  operationMetadata: ControllerOperationMetadata;
  application: RestApplication;
  route: string;
}

export type RegisterCallback = (operationRegistration: HttpOperationRegistration) => void;

@injectable()
export class HttpOperationsRegistrationService {
  private readonly logger;

  constructor(
    @inject(LOGGER_FACTORY) loggerFactory: LoggerFactory,
    private readonly metadataReader: HttpControllerMetadataReader,
    private readonly openApiDefinitionService: OpenApiDefinitionService,
  ) {
    this.logger = loggerFactory();
  }

  registerOperations(controllerClass: TriggerHandlerClass, registerCallback: RegisterCallback): void {
    const controllerMetadata = this.metadataReader.getHandlerClassMetadata(controllerClass);
    const pathErrors = assertOpenApiConsistentPath(controllerMetadata.path);
    if (pathErrors.length > 0) {
      throw new OpenApiDefinitionError(`Controller ${controllerClass.name} has inconsistent path`, {
        details: {
          controllerMetadata,
          pathErrors,
        },
      });
    }
    const prototype = controllerClass.prototype;
    const application = this.openApiDefinitionService.getApplication(controllerMetadata.application);
    this.logger.debug('Registering operations for controller started', {
      class: controllerClass.name,
      metadata: controllerMetadata,
    });
    let operationsCount = 0;
    for (const controllerMethod of Object.getOwnPropertyNames(prototype)) {
      const operationMetadata = this.getOperationMetadata(controllerClass, controllerMethod);
      if (operationMetadata === undefined) {
        continue;
      }
      const operationId = operationMetadata.operationId ?? controllerMethod;
      if (operationMetadata.path !== undefined) {
        const operationPathErrors = assertOpenApiConsistentPath(operationMetadata.path);
        if (operationPathErrors.length > 0) {
          throw new OpenApiDefinitionError(
            `Operation ${operationId} in controller ${controllerClass.name} has inconsistent path`,
            {
              details: {
                controllerMetadata,
                operationMetadata,
                operationPathErrors,
              },
            },
          );
        }
      }
      const route = joinPosix(controllerMetadata.path, operationMetadata.path ?? '');
      const operationRegistration: HttpOperationRegistration = {
        operationId,
        controllerMethod,
        controllerMetadata: controllerMetadata,
        operationMetadata,
        application,
        route,
      };
      registerCallback(operationRegistration);
      operationsCount++;
      this.logger.debug(
        `Operation ${operationId} for ${route} in controller class ${controllerClass.name} registered`,
        {
          operationRegistration,
        },
      );
    }
    this.logger.verbose(`${operationsCount} operation(s) for controller ${controllerClass.name} registered`);
  }

  private getOperationMetadata(
    controllerClass: TriggerHandlerClass,
    controllerMethod: string,
  ): ControllerOperationMetadata | undefined {
    try {
      return this.metadataReader.getOperationMetadata(controllerClass, controllerMethod);
    } catch (error) {
      // if Azure Function class is not HTTP Controller
      if (error instanceof TriggerHandlerMetadataError) {
        return undefined;
      }
      throw error;
    }
  }
}
