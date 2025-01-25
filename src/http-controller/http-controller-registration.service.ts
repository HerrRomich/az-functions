import { app } from '@azure/functions';
import { inject, injectable } from 'inversify';
import { AzureFunctions, PLATFORM_MODE, PlatformMode } from 'shared';
import { FunctionsRegistrationService } from '../platform';
import { ControllerMetadata, ControllerOperationMetadata, HttpControllerMetadataService } from './decorators';
import { httpMethodMap } from './http-controller-platform.model';
import { RestApplication } from './http-controller.model';
import { HttpRequestHandlerProvider } from './http-request-handler.provider';
import { OpenApiDefinitionService } from './open-api-definition.service';

export interface HttpOperationRegistrationData {
  controller: AzureFunctions;
  operation: string;
  controllerMetadata: ControllerMetadata;
  operationMetadata: ControllerOperationMetadata;
  application: RestApplication;
  route: string;
}

@injectable()
export class HttpControllerRegistrationService implements FunctionsRegistrationService {
  constructor(
    @inject(PLATFORM_MODE) private readonly platformMode: PlatformMode,
    private readonly controllerMetadataService: HttpControllerMetadataService,
    private readonly openApiDefinitionService: OpenApiDefinitionService,
    private readonly httpRequestHandlerProvider: HttpRequestHandlerProvider
  ) {}

  register(functions: AzureFunctions, controllerMetadata: ControllerMetadata) {
    const prototype = functions.constructor.prototype;
    const application = this.openApiDefinitionService.getApplication(controllerMetadata.application);
    for (const member of Object.getOwnPropertyNames(prototype)) {
      if (typeof prototype[member] === 'function') {
        const operationMetadata = this.controllerMetadataService.getOperationMetadata(functions, member);
        if (!operationMetadata) {
          continue;
        }
        const registrationData: HttpOperationRegistrationData = {
          controller: functions,
          operation: member,
          controllerMetadata,
          operationMetadata,
          application,
          route: this.getRoute(controllerMetadata, operationMetadata),
        };
        if (this.platformMode === 'start') {
          this.registerTrigger(registrationData);
        }
        this.openApiDefinitionService.registerOperation(registrationData);
      }
    }
  }

  private registerTrigger(registrationData: HttpOperationRegistrationData) {
    const { controller, operation, operationMetadata } = registrationData;

    const controllerPrototype = controller.constructor.prototype;
    const route = registrationData.application.context + '/' + registrationData.route;
    const method = async (...args: unknown[]): Promise<unknown> => {
      return await controllerPrototype[operation].call(controller, ...args);
    };
    const httpRequestHandler = this.httpRequestHandlerProvider.getHttpRequestHandler(registrationData, method);
    app.http(operationMetadata.operationId ?? operation, {
      route,
      methods: [httpMethodMap[operationMetadata.method]],
      handler: httpRequestHandler,
    });
  }

  private getRoute(controllerMetadata: ControllerMetadata, operationMetadata: ControllerOperationMetadata) {
    return (controllerMetadata.path + '/' + (operationMetadata.path ?? ''))
      .replace(/^\/*/, '')
      .replace(/\/*$/, '')
      .replace(/\/{2,}/, '/');
  }
}
