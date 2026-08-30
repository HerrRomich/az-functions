import { app } from '@azure/functions';
import { BindToFluentSyntax, Container } from 'inversify';
import { mock, mockFn, MockProxy } from 'jest-mock-extended';
import { getPartialFixture } from 'test-utilities';
import { HttpControllerRegistrationService } from './http-controller-registration.service';
import { HttpHandlerFactory, RequestHandler } from './http-handler.factory';
import { HttpOperationRegistration, HttpOperationsRegistrationService } from './http-operations-registration.service';

jest.mock('@azure/functions');

describe('HttpControllerRegistrationService', () => {
  let mockPlatformContainer: MockProxy<Container>;
  let mockFluentSyntax: MockProxy<BindToFluentSyntax<any>>;
  let mockRegistrationService: MockProxy<HttpOperationsRegistrationService>;
  let mockHandlerFactory: MockProxy<HttpHandlerFactory>;

  let subject: HttpControllerRegistrationService;

  beforeEach(() => {
    mockPlatformContainer = mock<Container>();
    mockFluentSyntax = mock<BindToFluentSyntax<any>>();
    mockPlatformContainer.bind.mockReturnValue(mockFluentSyntax);

    mockRegistrationService = mock<HttpOperationsRegistrationService>();
    mockHandlerFactory = mock<HttpHandlerFactory>();

    subject = new HttpControllerRegistrationService(mockPlatformContainer, mockRegistrationService, mockHandlerFactory);
  });

  describe('register', () => {
    const mockTestMethod = mockFn<(rg1: string, rg2: string) => string>();
    class TestController {
      testMethod(arg1: string, arg2: string): string {
        return mockTestMethod(arg1, arg2);
      }
    }
    const testRegistration = getPartialFixture<HttpOperationRegistration>({
      operationId: 'test-operation',
      application: {
        context: 'test-invocationContext',
      },
      route: 'test-route',
      operationMetadata: {
        authLevel: 'anonymous',
        extraInputs: [],
        extraOutputs: [],
        method: 'get',
      },
      controllerMethod: 'testMethod',
    });

    it('should bind the controller class to the platform container and register its operations', () => {
      mockPlatformContainer.get.calledWith(TestController).mockReturnValue(new TestController());

      subject.register(TestController);

      expect(mockPlatformContainer.bind).toHaveBeenCalledWith(TestController);
      expect(mockFluentSyntax.toSelf).toHaveBeenCalled();
      expect(mockPlatformContainer.get).toHaveBeenCalledWith(TestController);
      expect(mockRegistrationService.registerOperations).toHaveBeenCalledWith(TestController, expect.any(Function));
    });

    it('should register operations with the correct handler factory function', () => {
      const mockHandler = mockFn<RequestHandler>();
      mockHandlerFactory.createHandler.mockReturnValue(mockHandler);
      const controllerInstance = new TestController();
      mockPlatformContainer.get.calledWith(TestController).mockReturnValue(controllerInstance);

      subject.register(TestController);

      const handlerFactoryFunction = mockRegistrationService.registerOperations.mock.calls[0]![1];
      handlerFactoryFunction(testRegistration);

      expect(mockHandlerFactory.createHandler).toHaveBeenCalledWith(testRegistration, expect.any(Function));
      expect(app.http).toHaveBeenCalledWith(testRegistration.operationId, {
        route: `${testRegistration.application.context}/${testRegistration.route}`,
        methods: ['GET'],
        handler: mockHandler,
        authLevel: testRegistration.operationMetadata.authLevel,
        extraInputs: testRegistration.operationMetadata.extraInputs,
        extraOutputs: testRegistration.operationMetadata.extraOutputs,
      });
    });

    it('should call the controller method with the correct invocationContext', async () => {
      const controllerInstance = new TestController();
      mockPlatformContainer.get.calledWith(TestController).mockReturnValue(controllerInstance);

      subject.register(TestController);

      const handlerFactoryFunction = mockRegistrationService.registerOperations.mock.calls[0]![1];
      handlerFactoryFunction(testRegistration);

      const method = mockHandlerFactory.createHandler.mock.calls[0]![1];
      await method('arg1', 'arg2');
      expect(mockTestMethod).toHaveBeenCalledWith('arg1', 'arg2');
    });
  });
});
