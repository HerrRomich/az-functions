import { ContainerModule } from 'inversify';
import { AzureHttpTriggerService } from './azure-http-trigger.service';
import { HttpControllerMetadataService } from './decorators';
import { HttpControllerRegistrationService } from './http-controller-registration.service';
import { HttpRequestHandlerProvider } from './http-request-handler.provider';
import { OpenApiDefinitionService } from './open-api-definition.service';
import { OpenApiMetadataService } from './open-api-metadata.service';
import { REST_OPEN_API_REGISTRY, buildRestOpenApiRegistry } from './rest-open-api.regstry';
import { AuthenticationServiceFactory } from './security';
import { SwaggerHandlingService } from './swagger-handling.service';

export * from './azure-http-trigger.service';
export * from './decorators';
export * from './http-controller-registration.service';
export * from './http-controller.model';
export * from './open-api-definition.service';
export * from './swagger-handling.service';

export const httpControllerModule = new ContainerModule(({ bind }) => {
  bind(HttpControllerMetadataService).toSelf();
  bind(HttpRequestHandlerProvider).toSelf();
  bind(HttpControllerRegistrationService).toSelf();
  bind(SwaggerHandlingService).toSelf();
  bind(AzureHttpTriggerService).toSelf();
  bind(OpenApiMetadataService).toSelf();
  bind(AuthenticationServiceFactory).toSelf();
  bind(OpenApiDefinitionService).toSelf();
  bind(REST_OPEN_API_REGISTRY).toDynamicValue(context => buildRestOpenApiRegistry(context));
});
