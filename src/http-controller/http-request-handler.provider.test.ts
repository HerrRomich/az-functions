import { HttpRequest, InvocationContext } from '@azure/functions';
import { Container } from 'inversify';
import { mock, MockProxy } from 'jest-mock-extended';
import { PlatformContextLocalStorage, systemUserAccount, UserAccount } from 'shared';
import { z } from 'zod';
import { AzureHttpTriggerService } from './azure-http-trigger.service';
import { HttpOperationRegistrationData } from './http-controller-registration.service';
import { HttpRequestHandlerProvider, RequestHandler } from './http-request-handler.provider';
import { AuthenticationError, AuthenticationService, AuthenticationServiceFactory } from './security';

describe('HttpRequestHandlerProvider', () => {
  const storage = new PlatformContextLocalStorage();
  let mockHttpTriggerService: MockProxy<AzureHttpTriggerService>;
  let mockArgsProvider: jest.Mock;
  let mockPlatformContainer: MockProxy<Container>;
  let mockAuthenticationServiceFactory: MockProxy<AuthenticationServiceFactory>;
  let mockAuthenticationService: MockProxy<AuthenticationService>;

  let subject: HttpRequestHandlerProvider;

  beforeEach(() => {
    mockHttpTriggerService = mock();
    mockArgsProvider = jest.fn();
    mockArgsProvider.mockResolvedValue([]);
    mockHttpTriggerService.buildArgProviders.mockReturnValue(mockArgsProvider);
    mockHttpTriggerService.handleHttpRequest.mockImplementation(async (_1, _2, method) => {
      const jsonBody = await method();
      return {
        status: 200,
        jsonBody,
      };
    });
    mockPlatformContainer = mock();
    mockPlatformContainer.getAsync.calledWith(PlatformContextLocalStorage).mockResolvedValue(storage);
    mockAuthenticationServiceFactory = mock();
    const mockNegativeAuthenticationService = mock<AuthenticationService>();
    mockNegativeAuthenticationService.authenticate.mockRejectedValue(new AuthenticationError('Authentication failed.'));
    mockAuthenticationService = mock();
    mockAuthenticationServiceFactory.getAuthenticationServices.mockReturnValue([
      { securityScheme: 'scheme1', authenticationService: mockNegativeAuthenticationService },
      { securityScheme: 'scheme2', authenticationService: mockAuthenticationService },
    ]);

    subject = new HttpRequestHandlerProvider(
      mockHttpTriggerService,
      mockPlatformContainer,
      mockAuthenticationServiceFactory,
      systemUserAccount,
    );
  });

  describe('getHttpRequestHandler', () => {
    const testRegistrationData = {
      application: { name: 'test-application', openApiConfig: {} },
      operationMetadata: {
        method: 'post',
        path: 'test-path',
        operationId: 'test-operation',
        permissions: ['permission1', 'permission2', 'permission3'],
        requestBody: {
          content: {
            'application/json': {
              schema: z.string(),
            },
          },
        },
      },
      route: 'test-route',
    } as unknown as HttpOperationRegistrationData;
    const testUserAccount: UserAccount = {
      oid: '1bf630fa-8875-428d-a99b-8e28bbe65165',
      username: 'test-user',
      name: 'Test user',
      isAdminUser: false,
      isSystemUser: false,
      permissions: ['permission2', 'permission4', 'permission5'],
    };
    const testResponse = { testProp: 'testVal' };

    const mockRequest = {} as HttpRequest;
    const mockContext = {} as InvocationContext;
    let testRequestHandler: RequestHandler;

    it('should process request', async () => {
      mockAuthenticationService.authenticate.mockResolvedValue(testUserAccount);

      testRequestHandler = subject.getHttpRequestHandler(testRegistrationData, async () => {
        return testResponse;
      });
      const response = await testRequestHandler(mockRequest, mockContext);

      expect(response).toEqual({
        status: 200,
        jsonBody: testResponse,
      });
      expect(mockAuthenticationService.authenticate).toHaveBeenCalledExactlyOnceWith(mockRequest, mockContext);
      expect(mockArgsProvider).toHaveBeenCalledExactlyOnceWith(mockRequest, mockContext, testUserAccount);
    });

    it('should return unauthorized, if permissions not satisfied', async () => {
      mockAuthenticationService.authenticate.mockResolvedValue({
        ...testUserAccount,
        permissions: ['permission4', 'permission5'],
      });

      testRequestHandler = subject.getHttpRequestHandler(testRegistrationData, async () => {
        return testResponse;
      });
      const response = await testRequestHandler(mockRequest, mockContext);

      expect(response).toEqual({
        status: 401,
        body: 'Not enough permissions.',
      });
      expect(mockAuthenticationService.authenticate).toHaveBeenCalledExactlyOnceWith(mockRequest, mockContext);
      expect(mockArgsProvider).not.toHaveBeenCalled();
    });

    it('should return unauthorized, if can not authenticate', async () => {
      mockAuthenticationService.authenticate.mockRejectedValue(new AuthenticationError('Unable to authorize.'));

      testRequestHandler = subject.getHttpRequestHandler(testRegistrationData, async () => {
        return testResponse;
      });
      const response = await testRequestHandler(mockRequest, mockContext);

      expect(response).toEqual({
        status: 401,
        body: `Couldn't authenticate:
 scheme1: Authentication failed.
 scheme2: Unable to authorize.`,
      });
      expect(mockAuthenticationService.authenticate).toHaveBeenCalledExactlyOnceWith(mockRequest, mockContext);
      expect(mockArgsProvider).not.toHaveBeenCalled();
    });

    it('should return unauthorized, if no authentication is presented and system user has not enough permissions', async () => {
      mockAuthenticationServiceFactory.getAuthenticationServices.mockReturnValue([]);

      testRequestHandler = subject.getHttpRequestHandler(testRegistrationData, async () => {
        return testResponse;
      });
      const response = await testRequestHandler(mockRequest, mockContext);

      expect(response).toEqual({
        status: 401,
        body: 'Not enough permissions.',
      });
      expect(mockAuthenticationService.authenticate).not.toHaveBeenCalled();
      expect(mockArgsProvider).not.toHaveBeenCalled();
    });

    it('should return internal error, if authentication is failed', async () => {
      mockAuthenticationService.authenticate.mockRejectedValue(new Error('Runtime error.'));

      testRequestHandler = subject.getHttpRequestHandler(testRegistrationData, async () => {
        return testResponse;
      });
      const response = await testRequestHandler(mockRequest, mockContext);

      expect(response).toEqual({
        status: 500,
        body: `Internal authorization error.`,
      });
      expect(mockAuthenticationService.authenticate).toHaveBeenCalledExactlyOnceWith(mockRequest, mockContext);
      expect(mockArgsProvider).not.toHaveBeenCalled();
    });
  });
});
