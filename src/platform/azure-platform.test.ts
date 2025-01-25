import { app, HttpHandler, HttpMethodFunctionOptions, HttpRequest, InvocationContext } from '@azure/functions';
import * as fs from 'fs/promises';
import { Container } from 'inversify';
import { anyFunction, mock, MockProxy } from 'jest-mock-extended';
import * as path from 'path';
import * as process from 'process';
import { AZURE_FUNCTION, AzureFunctionRegistrationError, AzureFunctionsConstructor, PlatformMode } from 'shared';
import { OpenApiDefinitionService, SwaggerHandlingService } from '../http-controller';
import { AzurePlatform } from './azure-platform';
import { ComponentMetadata, FunctionsRegistrationService } from './model';
import { PlatformComponentMetadataService } from './platform-component-metadata.service';
import { RegisterFunctionFactory } from './register-functions.factory';

jest.mock('@azure/functions');
jest.mock('fs/promises');

describe('test AzureContainer', () => {
  const initSubject = (platformMode: PlatformMode = 'start') => {
    mockApiDefinitionService.getApplications.mockReturnValue(['rest']);
    const registerFunctionFactory: RegisterFunctionFactory = () => mockFunctionsRegistrationService;
    subject = new AzurePlatform(
      platformMode,
      mockPlatformContainer,
      registerFunctionFactory,
      mockSwaggerHandlingService,
      mockMetadataService,
      mockApiDefinitionService
    );
  };

  let subject: AzurePlatform;
  let mockPlatformContainer: MockProxy<Container>;
  let mockFunctionsRegistrationService: MockProxy<FunctionsRegistrationService>;
  let mockSwaggerHandlingService: MockProxy<SwaggerHandlingService>;
  let mockMetadataService: MockProxy<PlatformComponentMetadataService>;
  let mockApiDefinitionService: MockProxy<OpenApiDefinitionService>;

  beforeEach(() => {
    mockPlatformContainer = mock();
    mockFunctionsRegistrationService = mock();
    mockSwaggerHandlingService = mock();
    mockMetadataService = mock();
    mockApiDefinitionService = mock();
  });

  it('should not register swagger UI if no app config', async () => {
    initSubject();
    mockApiDefinitionService.getApplications.mockReturnValue([]);

    await subject.start();

    expect(app.get).not.toHaveBeenCalled();
  });

  it('should register swagger UI', async () => {
    initSubject();

    await subject.start();

    expect(app.get).toHaveBeenNthCalledWith(1, 'swaggerUi', {
      route: 'spec',
      handler: anyFunction(),
    });

    expect(app.get).toHaveBeenNthCalledWith(2, 'swaggerUiFile', {
      route: 'spec/{fileName}',
      handler: anyFunction(),
    });

    expect(app.get).toHaveBeenNthCalledWith(3, 'openApiDefinition', {
      route: 'spec/definition/{definitionName}',
      handler: anyFunction(),
    });
  });

  it('should register swagger UI', async () => {
    initSubject();
    let swaggerUiHandler: HttpHandler | undefined = undefined;
    let swaggerUiFileHandler: HttpHandler | undefined = undefined;
    let openApiDefinitionHandler: HttpHandler | undefined = undefined;
    jest.mocked(app.get).mockImplementation((name, { handler }: HttpMethodFunctionOptions) => {
      switch (name) {
        case 'swaggerUi':
          swaggerUiHandler = handler;
          break;
        case 'swaggerUiFile':
          swaggerUiFileHandler = handler;
          break;
        case 'openApiDefinition':
          openApiDefinitionHandler = handler;
          break;
      }
    });
    await subject.start();

    const request = mock<HttpRequest>();
    const context = mock<InvocationContext>();

    expect(swaggerUiHandler).toBeDefined();
    expect(mockSwaggerHandlingService.handleSwaggerUi).not.toHaveBeenCalled();
    await swaggerUiHandler!(request, context);
    expect(mockSwaggerHandlingService.handleSwaggerUi).toHaveBeenCalledWith(request);

    expect(swaggerUiFileHandler).toBeDefined();
    expect(mockSwaggerHandlingService.handleSwaggerContent).not.toHaveBeenCalled();
    await swaggerUiFileHandler!(request, context);
    expect(mockSwaggerHandlingService.handleSwaggerContent).toHaveBeenCalledWith(request);

    expect(openApiDefinitionHandler).toBeDefined();
    expect(mockSwaggerHandlingService.handleOpenApiDefinition).not.toHaveBeenCalled();
    await openApiDefinitionHandler!(request, context);
    expect(mockSwaggerHandlingService.handleOpenApiDefinition).toHaveBeenCalledWith(request);
  });

  it('should register functions', async () => {
    initSubject();
    const mockedComponent1 = mock<AzureFunctionsConstructor>();
    const mockedComponent1Metadata1 = {
      type: 'http-controller',
    } as unknown as ComponentMetadata;
    const mockedComponent2 = mock<AzureFunctionsConstructor>();
    const mockedComponent1Metadata2 = {
      type: 'event-hub-handlers',
    } as unknown as ComponentMetadata;
    mockMetadataService.getMetadata.calledWith(mockedComponent1).mockReturnValue(mockedComponent1Metadata1);
    mockMetadataService.getMetadata.calledWith(mockedComponent2).mockReturnValue(mockedComponent1Metadata2);
    mockPlatformContainer.isBound.calledWith(AZURE_FUNCTION).mockReturnValue(true);
    mockPlatformContainer.getAllAsync
      .calledWith(AZURE_FUNCTION)
      .mockResolvedValue([mockedComponent1, mockedComponent2]);

    await subject.start();

    expect(mockMetadataService.getMetadata).toHaveBeenCalledTimes(2);
    expect(mockFunctionsRegistrationService.register).toHaveBeenCalledWith(mockedComponent1, mockedComponent1Metadata1);
  });

  it('should fail registration if meets unknow type', async () => {
    initSubject();
    const mockedComponent = mock<AzureFunctionsConstructor>();
    mockMetadataService.getMetadata.calledWith(mockedComponent).mockReturnValue(undefined);
    mockPlatformContainer.isBound.calledWith(AZURE_FUNCTION).mockReturnValue(true);
    mockPlatformContainer.getAllAsync.calledWith(AZURE_FUNCTION).mockResolvedValue([mockedComponent]);

    await expect(subject.start()).rejects.toThrow(AzureFunctionRegistrationError);

    expect(mockMetadataService.getMetadata).toHaveBeenCalledTimes(1);
  });

  it('should generate OpenAPI definition if platform mode is "print-open-api"', async () => {
    jest.spyOn(process, 'cwd').mockReturnValue('test-dir');
    jest.mocked(fs.stat).mockRejectedValue(new Error("Dir doesn't exist."));
    initSubject('print-open-api');
    mockApiDefinitionService.getApplications.mockReturnValue(['app1', 'app2']);

    await subject.start();

    expect(fs.stat).toHaveBeenCalledWith(path.resolve('test-dir', 'dist/open-api-definitions'));
    expect(fs.mkdir).toHaveBeenCalledWith(path.resolve('test-dir', 'dist/open-api-definitions'));
    expect(mockApiDefinitionService.generateDocument).toHaveBeenNthCalledWith(1, 'app1');
    expect(mockApiDefinitionService.generateDocument).toHaveBeenNthCalledWith(2, 'app2');
  });
});
