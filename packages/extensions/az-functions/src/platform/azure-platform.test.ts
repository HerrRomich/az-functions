import { app, HttpRequest, InvocationContext } from '@azure/functions';
import { AppStartContext } from '@azure/functions/types/hooks/appHooks';
import { SwaggerHandlingService } from 'http-controller';
import { Container } from 'inversify';
import { mock, MockProxy } from 'jest-mock-extended';
import { Logger } from 'logger';
import { AzurePlatform } from './azure-platform';
import { RegisterTriggerHandlerFactory } from './register-trigger-handler.factory';
import { STARTUP_SERVICE } from './startup.service';

jest.mock('@azure/functions');

class TestClass1 {}
class TestClass2 {}

describe('test AzureContainer', () => {
  let subject: AzurePlatform;

  let mockPlatformContainer: MockProxy<Container>;
  let mockRegisterHandler: jest.MockedFn<RegisterTriggerHandlerFactory>;
  let mockSwaggerHandlingService: MockProxy<SwaggerHandlingService>;

  beforeEach(() => {
    mockPlatformContainer = mock<Container>();
    mockRegisterHandler = jest.fn();
    mockSwaggerHandlingService = mock<SwaggerHandlingService>();

    subject = new AzurePlatform(
      () => mock<Logger>(),
      mockPlatformContainer,
      mockRegisterHandler,
      mockSwaggerHandlingService,
    );
  });

  describe('start', () => {
    it('should register trigger handlers for provided classes', () => {
      subject.start([TestClass1, TestClass2]);

      expect(mockRegisterHandler).toHaveBeenNthCalledWith(1, TestClass1);
      expect(mockRegisterHandler).toHaveBeenNthCalledWith(2, TestClass2);
    });

    it('should register startup service if available', async () => {
      const mockStartup = jest.fn();
      const mockStartupService = { startup: mockStartup };
      const mockAppStart = jest.mocked(app.hook.appStart);
      mockPlatformContainer.get
        .calledWith(STARTUP_SERVICE, expect.objectContaining({ optional: true }))
        .mockReturnValue(mockStartupService);

      subject.start([TestClass1, TestClass2]);

      expect(app.hook.appStart).toHaveBeenCalled();
      const startupFunc = mockAppStart.mock.calls[0]![0];
      const mockStartupContext = mock<AppStartContext>();
      await startupFunc(mockStartupContext);
      expect(mockStartup).toHaveBeenCalled();
    });
  });

  it('should register swagger ui routes', async () => {
    const mockAppGet = jest.mocked(app.get);
    subject.start([TestClass1, TestClass2]);

    expect(app.get).toHaveBeenCalledWith(
      'swaggerUi',
      expect.objectContaining({
        route: 'spec/{fileName?}',
        handler: expect.any(Function),
      }),
    );

    expect(app.get).toHaveBeenCalledWith(
      'openApiDefinition',
      expect.objectContaining({
        route: 'spec/definition/{definitionName}',
        handler: expect.any(Function),
      }),
    );

    const handlerSwaggerContext = mockAppGet.mock.calls[0]![1].handler;
    const handlerDefinition = mockAppGet.mock.calls[1]![1].handler;

    const mockContextRequest = mock<HttpRequest>();
    await handlerSwaggerContext(mockContextRequest, mock<InvocationContext>());
    expect(mockSwaggerHandlingService.handleSwaggerContent).toHaveBeenCalledWith(mockContextRequest);

    const mockDefinitionRequest = mock<HttpRequest>();
    await handlerDefinition(mockDefinitionRequest, mock<InvocationContext>());
    expect(mockSwaggerHandlingService.handleOpenApiDefinition).toHaveBeenCalledWith(mockDefinitionRequest);
  });
});
