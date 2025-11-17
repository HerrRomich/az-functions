import { Container } from 'inversify';
import { HttpRequestHandlerProvider } from './http-request-handler.provider';
import {
  AzureHttpTriggerService,
  HttpControllerMetadataService,
  httpControllerModule,
  HttpControllerRegistrationService,
  OpenApiDefinitionService,
  SwaggerHandlingService,
} from './index';
import { OpenApiMetadataService } from './open-api-metadata.service';
import { REST_OPEN_API_REGISTRY } from './rest-open-api.regstry';
import { AuthenticationServiceFactory } from './security';

describe('http-controller', () => {
  let iocContainer: Container;

  beforeEach(() => {
    iocContainer = new Container({
      defaultScope: 'Singleton',
    });
  });

  it('should register services', async () => {
    await iocContainer.load(httpControllerModule);

    expect(iocContainer.isBound(HttpControllerMetadataService)).toBeTruthy();
    expect(iocContainer.isBound(HttpRequestHandlerProvider)).toBeTruthy();
    expect(iocContainer.isBound(HttpControllerRegistrationService)).toBeTruthy();
    expect(iocContainer.isBound(SwaggerHandlingService)).toBeTruthy();
    expect(iocContainer.isBound(AzureHttpTriggerService)).toBeTruthy();
    expect(iocContainer.isBound(OpenApiMetadataService)).toBeTruthy();
    expect(iocContainer.isBound(AuthenticationServiceFactory)).toBeTruthy();
    expect(iocContainer.isBound(OpenApiDefinitionService)).toBeTruthy();
    expect(iocContainer.isBound(REST_OPEN_API_REGISTRY)).toBeTruthy();
  });
});
