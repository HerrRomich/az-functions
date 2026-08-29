import { app, HttpMethod } from '@azure/functions';
import { Container, inject, injectable } from 'inversify';
import { PLATFORM_CONTAINER, TriggerHandlerClass, TriggerHandlerRegistrationService } from 'shared';
import { OperationMethod } from './decorators';
import { HttpHandlerFactory } from './http-handler.factory';
import { HttpOperationRegistration, HttpOperationsRegistrationService } from './http-operations-registration.service';

const httpMethodMap: Record<OperationMethod, HttpMethod> = {
  get: 'GET',
  head: 'HEAD',
  delete: 'DELETE',
  post: 'POST',
  put: 'PUT',
  patch: 'PATCH',
};

@injectable()
export class HttpControllerRegistrationService implements TriggerHandlerRegistrationService {
  constructor(
    @inject(PLATFORM_CONTAINER) private readonly platformContainer: Container,
    private readonly operationsRegistrationService: HttpOperationsRegistrationService,
    private readonly handlerFactory: HttpHandlerFactory,
  ) {}

  register(controllerClass: TriggerHandlerClass) {
    this.platformContainer.bind(controllerClass).toSelf();
    const controller = this.platformContainer.get(controllerClass);
    this.operationsRegistrationService.registerOperations(controllerClass, registrationData => {
      this.registerTrigger(controller, registrationData);
    });
  }

  private registerTrigger(controller: object, registrationData: HttpOperationRegistration) {
    const { operationId, controllerMethod, operationMetadata } = registrationData;

    const controllerPrototype = controller.constructor.prototype;
    const route = registrationData.application.context + '/' + registrationData.route;
    const method = async (...args: unknown[]): Promise<unknown> => {
      return await controllerPrototype[controllerMethod].call(controller, ...args);
    };
    const handler = this.handlerFactory.createHandler(registrationData, method);
    const { method: httpMethod, authLevel, extraInputs, extraOutputs } = operationMetadata;
    app.http(operationId, {
      route,
      methods: [httpMethodMap[httpMethod]],
      handler,
      authLevel,
      extraInputs,
      extraOutputs,
    });
  }
}
