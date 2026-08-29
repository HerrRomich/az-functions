import { HttpRequest, HttpResponse, InvocationContext } from '@azure/functions';
import { getPartialFixture } from '@utilities/test-utilities';
import {
  PLATFORM_CONTEXT_MANAGER,
  PLATFORM_CONTEXT_PROVIDER,
  PlatformContext,
  PlatformContextManager,
  PlatformContextProvider,
} from 'context';
import { StatusCodes } from 'http-status-codes';
import { Container } from 'inversify';
import { fn, Mock } from 'jest-mock';
import { CalledWithMock, mock, mockFn, MockProxy } from 'jest-mock-extended';
import { Logger } from 'logger';
import { AuthContext, AUTHENTICATION_CONTEXT_KEY } from 'security';
import { CommonHttpTriggerError, UnauthorizedError } from './http-controller.model';
import {
  HttpHandlerSupportFactory,
  HttpRequestArgsProvider,
  HttpResponseProcessor,
} from './http-handler-support.factory';
import { HttpHandlerFactory, RequestHandler } from './http-handler.factory';
import { HttpOperationRegistration } from './http-operations-registration.service';
import { AuthenticationHandler, AuthenticatorProvider } from './security/authenticator.provider';

jest.mock('logger', () => {
  const originalModule = jest.requireActual('logger');
  return {
    ...originalModule,
    adjustContextLoggerMetadata: jest.fn(),
  };
});

describe('HttpHandlerFactory', () => {
  let mockPlatformContainer: MockProxy<Container>;
  let mockContextManager: MockProxy<PlatformContextManager>;
  let mockContextProvider: MockProxy<PlatformContextProvider>;
  let mockLogger: MockProxy<Logger>;
  let mockSupportService: MockProxy<HttpHandlerSupportFactory>;
  let mockArgsProvider: Mock<HttpRequestArgsProvider>;
  let mockResponseProcessor: Mock<HttpResponseProcessor>;
  let mockAuthenticationProviderService: MockProxy<AuthenticatorProvider>;
  let mockAuthenticator: Mock<AuthenticationHandler>;

  let subject: HttpHandlerFactory;

  beforeEach(() => {
    mockPlatformContainer = mock<Container>();
    mockContextManager = mock<PlatformContextManager>();
    mockPlatformContainer.get.calledWith(PLATFORM_CONTEXT_MANAGER).mockReturnValue(mockContextManager);
    mockContextProvider = mock<PlatformContextProvider>();
    mockPlatformContainer.get.calledWith(PLATFORM_CONTEXT_PROVIDER).mockReturnValue(mockContextProvider);

    mockLogger = mock();

    mockSupportService = mock<HttpHandlerSupportFactory>();
    mockArgsProvider = fn<HttpRequestArgsProvider>();
    mockSupportService.createRequestArgsProvider.mockReturnValue(mockArgsProvider);
    mockResponseProcessor = fn<HttpResponseProcessor>();
    mockSupportService.createResponseProcessor.mockReturnValue(mockResponseProcessor);

    mockAuthenticationProviderService = mock<AuthenticatorProvider>();
    mockAuthenticator = fn<AuthenticationHandler>();
    mockAuthenticationProviderService.provideAuthenticator.mockReturnValue(mockAuthenticator);

    subject = new HttpHandlerFactory(
      () => mockLogger,
      mockPlatformContainer,
      mockSupportService,
      mockAuthenticationProviderService,
    );
  });

  describe('createHandler', () => {
    const testResponse = { testProp: 'testVal' };
    const testHttpResponses = new HttpResponse({ jsonBody: testResponse });

    let mockMethod: CalledWithMock<(...args: unknown[]) => Promise<unknown>>;

    const testRegistrationData = getPartialFixture<HttpOperationRegistration>({
      operationId: 'test-controllerMethod',
      application: { name: 'test-application', openApiConfig: {} },
      operationMetadata: {
        method: 'post',
        path: 'test-path',
        operationId: 'test-controllerMethod',
        security: [
          {
            f: ['permission1', 'permission2', 'permission3'],
          },
        ],
      },
      route: 'test-route',
    });
    const testAuthContext = getPartialFixture<AuthContext>({
      principal: {
        scopes: ['permission2', 'permission4', 'permission5'],
      },
    });

    const stubRequest = new HttpRequest({
      method: 'POST',
      url: 'https://test-url/test-path',
      headers: { 'Content-Type': 'application/json' },
      body: { string: JSON.stringify({ testBodyProp: 'testBodyVal' }) },
    });
    const mockContext = mock<InvocationContext>();
    let mockPlatformContext: MockProxy<PlatformContext>;
    let testRequestHandler: RequestHandler;

    beforeEach(() => {
      mockContextManager.runWith.mockImplementation((_context, callback) => {
        return callback();
      });
      mockPlatformContext = mock<PlatformContext>();
      mockContextManager.active.mockReturnValue(mockPlatformContext);
      mockContextProvider.providePlatformContext.mockReturnValue(mockPlatformContext);
      mockArgsProvider.mockResolvedValue(['arg1', 'arg2']);

      mockAuthenticator.mockResolvedValue(testAuthContext);
      mockMethod = mockFn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue(testResponse);
      testRequestHandler = subject.createHandler(testRegistrationData, mockMethod);
      mockResponseProcessor.mockResolvedValue(testHttpResponses);
    });

    it('should process request', async () => {
      const response = await testRequestHandler(stubRequest, mockContext);

      expect(mockAuthenticator).toHaveBeenCalledWith(stubRequest);

      expect(mockContextManager.runWith).toHaveBeenCalledWith(mockPlatformContext, expect.any(Function));
      expect(mockContextManager.active).toHaveBeenCalled();
      expect(mockPlatformContext.setValue).toHaveBeenCalledWith(AUTHENTICATION_CONTEXT_KEY, testAuthContext);

      expect(mockArgsProvider).toHaveBeenCalledWith({
        request: stubRequest,
        invocationContext: mockContext,
        authContext: testAuthContext,
      });

      expect(mockMethod).toHaveBeenCalledWith('arg1', 'arg2');

      expect(mockResponseProcessor).toHaveBeenCalledWith(testResponse);

      expect(response).toBe(testHttpResponses);
    });

    it('should process request, if controllerMethod has no permissions defined', async () => {
      const registrationDataNoPermissions = {
        ...testRegistrationData,
        operationMetadata: {
          ...testRegistrationData.operationMetadata,
          permissions: undefined,
        },
      };
      testRequestHandler = subject.createHandler(registrationDataNoPermissions, async () => {
        return testResponse;
      });

      const response = await testRequestHandler(stubRequest, mockContext);

      expect(response).toBe(testHttpResponses);
    });

    it('should return unauthorized, if can not authenticate', async () => {
      mockAuthenticator.mockRejectedValue(new UnauthorizedError('Authentication failed.'));

      const response = await testRequestHandler(stubRequest, mockContext);

      expect(mockContextManager.active).not.toHaveBeenCalled();
      expect(mockPlatformContext.setValue).not.toHaveBeenCalled();
      expect(mockArgsProvider).not.toHaveBeenCalled();
      expect(mockMethod).not.toHaveBeenCalled();
      expect(mockResponseProcessor).not.toHaveBeenCalled();
      expect(response.status).toEqual(StatusCodes.UNAUTHORIZED);
      expect(response.body).toEqual('Authentication failed.');
    });

    it('should return bad request, if method is failed with known error', async () => {
      const errorResponseBody = {
        errorStringProp: 'errorStringVal',
        errorNumberProp: 123,
      };
      mockMethod.mockRejectedValue(
        new CommonHttpTriggerError('Some request error', {
          response: {
            status: StatusCodes.CONFLICT,
            jsonBody: errorResponseBody,
          },
        }),
      );

      const response = await testRequestHandler(stubRequest, mockContext);

      expect(mockResponseProcessor).not.toHaveBeenCalled();
      expect(response.status).toEqual(StatusCodes.CONFLICT);
      expect(response.jsonBody).toEqual(errorResponseBody);
    });

    it('should return internal error, if method is failed with unknown error', async () => {
      const testError = new Error('Runtime error.');
      mockMethod.mockRejectedValue(testError);

      const response = await testRequestHandler(stubRequest, mockContext);

      expect(mockResponseProcessor).not.toHaveBeenCalled();
      expect(response.status).toEqual(StatusCodes.INTERNAL_SERVER_ERROR);
      expect(response.body).toEqual('Internal server error.');
    });
  });
});
