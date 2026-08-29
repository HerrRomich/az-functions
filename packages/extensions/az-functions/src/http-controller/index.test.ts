import { BindInWhenOnFluentSyntax, BindToFluentSyntax, ContainerModuleLoadOptions } from 'inversify';
import { mock, MockProxy } from 'jest-mock-extended';
import { TRIGGER_HANDLER_REGISTRATION_SERVICE } from 'shared';
import { HttpHandlerFactory } from './http-handler.factory';
import { HttpOperationsRegistrationService } from './http-operations-registration.service';
import { HttpRequestArgProviderFactory } from './http-request-arg-provider.factory';
import { HttpResponseProcessorFactory } from './http-response-processor.factory';
import {
  HTTP_CONTROLLER_TYPE,
  HttpControllerMetadataReader,
  HttpControllerModule,
  HttpControllerRegistrationService,
  HttpHandlerSupportFactory,
  OpenApiDefinitionService,
  OpenApiPrintService,
  OpenApiRegistrationService,
  SwaggerHandlingService,
} from './index';
import { OpenApiMetadataService } from './open-api-metadata.service';
import { AuthenticatorProvider } from './security/authenticator.provider';
import { OperationAuthenticationResolver } from './security/operation-authentication.resolver';
import { FallbackPrincipalMergeService } from './security/principal-merge.service';
import { StrictPrincipalMergeService } from './security/strict-principal-merge.servce';

describe('http-controller', () => {
  let mockLoadOptions: MockProxy<ContainerModuleLoadOptions>;

  beforeEach(() => {
    mockLoadOptions = mock<ContainerModuleLoadOptions>();

    mockLoadOptions.bind.mockImplementation(() => {
      const mockBinding = mock<BindToFluentSyntax<any>>();
      mockBinding.to.mockImplementation(() => mock<BindInWhenOnFluentSyntax<any>>());
      return mockBinding;
    });
  });

  it('should register 16 services', async () => {
    await HttpControllerModule.load(mockLoadOptions);

    expect(mockLoadOptions.bind).toHaveBeenCalledTimes(16);
  });

  it('should register HttpControllerMetadataReader', async () => {
    await HttpControllerModule.load(mockLoadOptions);

    expect(mockLoadOptions.bind).toHaveBeenNthCalledWith(1, HttpControllerMetadataReader);
    const mockBindSyntax = mockLoadOptions.bind.mock.results[0]!.value as MockProxy<
      BindToFluentSyntax<HttpControllerMetadataReader>
    >;
    expect(mockBindSyntax.toSelf).toHaveBeenCalled();
  });

  it('should register HttpHandlerFactory', async () => {
    await HttpControllerModule.load(mockLoadOptions);

    expect(mockLoadOptions.bind).toHaveBeenNthCalledWith(2, HttpHandlerFactory);
    const mockBindSyntax = mockLoadOptions.bind.mock.results[1]!.value as MockProxy<
      BindToFluentSyntax<HttpHandlerFactory>
    >;
    expect(mockBindSyntax.toSelf).toHaveBeenCalled();
  });

  it('should register TRIGGER_HANDLER_REGISTRATION_SERVICE with HttpControllerRegistrationService when named HTTP_CONTROLLER_TYPE', async () => {
    await HttpControllerModule.load(mockLoadOptions);

    expect(mockLoadOptions.bind).toHaveBeenNthCalledWith(3, TRIGGER_HANDLER_REGISTRATION_SERVICE);
    const mockBindSyntax = mockLoadOptions.bind.mock.results[2]!.value as MockProxy<
      BindToFluentSyntax<HttpControllerRegistrationService>
    >;
    expect(mockBindSyntax.to).toHaveBeenCalledWith(HttpControllerRegistrationService);
    const mockBindWhenSyntax = mockBindSyntax.to.mock.results[0]!.value as MockProxy<
      BindInWhenOnFluentSyntax<HttpControllerRegistrationService>
    >;
    expect(mockBindWhenSyntax.whenNamed).toHaveBeenCalledWith(HTTP_CONTROLLER_TYPE);
  });

  it('should register SwaggerHandlingService', async () => {
    await HttpControllerModule.load(mockLoadOptions);

    expect(mockLoadOptions.bind).toHaveBeenNthCalledWith(4, SwaggerHandlingService);
    const mockBindSyntax = mockLoadOptions.bind.mock.results[3]!.value as MockProxy<
      BindToFluentSyntax<SwaggerHandlingService>
    >;
    expect(mockBindSyntax.toSelf).toHaveBeenCalled();
  });

  it('should register HttpHandlerSupportFactory', async () => {
    await HttpControllerModule.load(mockLoadOptions);

    expect(mockLoadOptions.bind).toHaveBeenNthCalledWith(5, HttpHandlerSupportFactory);
    const mockBindSyntax = mockLoadOptions.bind.mock.results[4]!.value as MockProxy<
      BindToFluentSyntax<HttpHandlerSupportFactory>
    >;
    expect(mockBindSyntax.toSelf).toHaveBeenCalled();
  });

  it('should register HttpRequestArgProviderFactory', async () => {
    await HttpControllerModule.load(mockLoadOptions);

    expect(mockLoadOptions.bind).toHaveBeenNthCalledWith(6, HttpRequestArgProviderFactory);
    const mockBindSyntax = mockLoadOptions.bind.mock.results[5]!.value as MockProxy<
      BindToFluentSyntax<HttpRequestArgProviderFactory>
    >;
    expect(mockBindSyntax.toSelf).toHaveBeenCalled();
  });

  it('should register HttpResponseProcessorFactory', async () => {
    await HttpControllerModule.load(mockLoadOptions);

    expect(mockLoadOptions.bind).toHaveBeenNthCalledWith(7, HttpResponseProcessorFactory);
    const mockBindSyntax = mockLoadOptions.bind.mock.results[6]!.value as MockProxy<
      BindToFluentSyntax<HttpResponseProcessorFactory>
    >;
    expect(mockBindSyntax.toSelf).toHaveBeenCalled();
  });

  it('should register OpenApiMetadataService', async () => {
    await HttpControllerModule.load(mockLoadOptions);

    expect(mockLoadOptions.bind).toHaveBeenNthCalledWith(8, OpenApiMetadataService);
    const mockBindSyntax = mockLoadOptions.bind.mock.results[7]!.value as MockProxy<
      BindToFluentSyntax<OpenApiMetadataService>
    >;
    expect(mockBindSyntax.toSelf).toHaveBeenCalled();
  });

  it('should register AuthenticatorProvider', async () => {
    await HttpControllerModule.load(mockLoadOptions);

    expect(mockLoadOptions.bind).toHaveBeenNthCalledWith(9, AuthenticatorProvider);
    const mockBindSyntax = mockLoadOptions.bind.mock.results[8]!.value as MockProxy<
      BindToFluentSyntax<AuthenticatorProvider>
    >;
    expect(mockBindSyntax.toSelf).toHaveBeenCalled();
  });

  it('should register OperationAuthenticationResolver', async () => {
    await HttpControllerModule.load(mockLoadOptions);

    expect(mockLoadOptions.bind).toHaveBeenNthCalledWith(10, OperationAuthenticationResolver);
    const mockBindSyntax = mockLoadOptions.bind.mock.results[9]!.value as MockProxy<
      BindToFluentSyntax<OperationAuthenticationResolver>
    >;
    expect(mockBindSyntax.toSelf).toHaveBeenCalled();
  });

  it('should register OpenApiRegistrationService', async () => {
    await HttpControllerModule.load(mockLoadOptions);

    expect(mockLoadOptions.bind).toHaveBeenNthCalledWith(11, OpenApiRegistrationService);
    const mockBindSyntax = mockLoadOptions.bind.mock.results[10]!.value as MockProxy<
      BindToFluentSyntax<OpenApiRegistrationService>
    >;
    expect(mockBindSyntax.toSelf).toHaveBeenCalled();
  });

  it('should register OpenApiDefinitionService', async () => {
    await HttpControllerModule.load(mockLoadOptions);
    expect(mockLoadOptions.bind).toHaveBeenNthCalledWith(12, OpenApiDefinitionService);
    const mockBindSyntax = mockLoadOptions.bind.mock.results[11]!.value as MockProxy<
      BindToFluentSyntax<OpenApiDefinitionService>
    >;
    expect(mockBindSyntax.toSelf).toHaveBeenCalled();
  });

  it('should register HttpOperationsRegistrationService', async () => {
    await HttpControllerModule.load(mockLoadOptions);
    expect(mockLoadOptions.bind).toHaveBeenNthCalledWith(13, HttpOperationsRegistrationService);
    const mockBindSyntax = mockLoadOptions.bind.mock.results[12]!.value as MockProxy<
      BindToFluentSyntax<HttpOperationsRegistrationService>
    >;
    expect(mockBindSyntax.toSelf).toHaveBeenCalled();
  });

  it('should register OpenApiPrintService', async () => {
    await HttpControllerModule.load(mockLoadOptions);
    expect(mockLoadOptions.bind).toHaveBeenNthCalledWith(14, OpenApiPrintService);
    const mockBindSyntax = mockLoadOptions.bind.mock.results[13]!.value as MockProxy<
      BindToFluentSyntax<OpenApiPrintService>
    >;
    expect(mockBindSyntax.toSelf).toHaveBeenCalled();
  });

  it('should register FallbackPrincipalMergeService', async () => {
    await HttpControllerModule.load(mockLoadOptions);
    expect(mockLoadOptions.bind).toHaveBeenNthCalledWith(15, FallbackPrincipalMergeService);
    const mockBindSyntax = mockLoadOptions.bind.mock.results[14]!.value as MockProxy<
      BindToFluentSyntax<FallbackPrincipalMergeService>
    >;
    expect(mockBindSyntax.toSelf).toHaveBeenCalled();
  });

  it('should register StrictPrincipalMergeService', async () => {
    await HttpControllerModule.load(mockLoadOptions);
    expect(mockLoadOptions.bind).toHaveBeenNthCalledWith(16, StrictPrincipalMergeService);
    const mockBindSyntax = mockLoadOptions.bind.mock.results[15]!.value as MockProxy<
      BindToFluentSyntax<StrictPrincipalMergeService>
    >;
    expect(mockBindSyntax.toSelf).toHaveBeenCalled();
  });
});
