import { HttpRequest } from '@azure/functions';
import { getPartialFixture } from '@utilities/test-utilities';
import {
  AUTHENTICATION_SERVICE,
  AuthenticationService,
  HttpTriggerDefinitionError,
  REST_APPLICATION_TAG_KEY,
} from 'http-controller';
import { Container } from 'inversify';
import { mock, MockProxy } from 'jest-mock-extended';
import { Logger } from 'logger';
import { SecurityRequirementObject, SecuritySchemeObject } from 'openapi3-ts/oas30';
import { HttpOperationRegistration } from '../http-operations-registration.service';
import { OperationAuthenticationResolver } from './operation-authentication.resolver';

describe('OperationAuthenticationResolver', () => {
  let mockPlatformContainer: MockProxy<Container>;
  let subject: OperationAuthenticationResolver;

  beforeEach(() => {
    mockPlatformContainer = mock<Container>();
    subject = new OperationAuthenticationResolver(() => mock<Logger>(), mockPlatformContainer);
  });

  describe('resolveAuthentications', () => {
    const testApplicationName = 'testApp';
    const testSecuritySchemes: Record<string, SecuritySchemeObject> = {
      apiKeyAuth: { type: 'apiKey' },
      basicHttpAuthentication: { type: 'http' },
      bearerHttpAuthentication: { type: 'http' },
      oauth2Profiles: { type: 'oauth2' },
    };
    const testOperationSecurity: SecurityRequirementObject[] = [
      { apiKeyAuth: ['api-key:scope1', 'api-key:scope2'] },
      {
        basicHttpAuthentication: ['basic-http:scope1', 'basic-http:scope2'],
        bearerHttpAuthentication: ['bearer-http:scope1', 'bearer-http:scope2'],
      },
    ];
    const testApplicationSecurity: SecurityRequirementObject[] = [
      {
        basicHttpAuthentication: ['basic-http:scope1', 'basic-http:scope2'],
        apiKeyAuth: ['api-key:scope1', 'api-key:scope2'],
      },
      {
        oauth2Profiles: ['oauth2:scope1', 'oauth2:scope2'],
        bearerHttpAuthentication: ['bearer-http:scope1', 'bearer-http:scope2'],
      },
    ];
    let mockApiKeyAuthenticationService: MockProxy<AuthenticationService>;
    let mockBearerAuthenticationService: MockProxy<AuthenticationService>;
    let mockBasicAuthenticationService: MockProxy<AuthenticationService>;
    let mockOAuth2AuthenticationService: MockProxy<AuthenticationService>;

    beforeEach(() => {
      mockApiKeyAuthenticationService = mock<AuthenticationService>();
      mock(mockPlatformContainer.get)
        .calledWith(
          AUTHENTICATION_SERVICE,
          expect.objectContaining({
            name: 'apiKeyAuth',
            tag: { key: REST_APPLICATION_TAG_KEY, value: testApplicationName },
          }),
        )
        .mockReturnValue(mockApiKeyAuthenticationService);
      mockBearerAuthenticationService = mock<AuthenticationService>();
      mock(mockPlatformContainer.get)
        .calledWith(
          AUTHENTICATION_SERVICE,
          expect.objectContaining({
            name: 'bearerHttpAuthentication',
            tag: { key: REST_APPLICATION_TAG_KEY, value: testApplicationName },
          }),
        )
        .mockReturnValue(mockBearerAuthenticationService);
      mockBasicAuthenticationService = mock<AuthenticationService>();
      mock(mockPlatformContainer.get)
        .calledWith(
          AUTHENTICATION_SERVICE,
          expect.objectContaining({
            name: 'basicHttpAuthentication',
            tag: { key: REST_APPLICATION_TAG_KEY, value: testApplicationName },
          }),
        )
        .mockReturnValue(mockBasicAuthenticationService);
      mockOAuth2AuthenticationService = mock<AuthenticationService>();
      mock(mockPlatformContainer.get)
        .calledWith(
          AUTHENTICATION_SERVICE,
          expect.objectContaining({
            name: 'oauth2Profiles',
            tag: { key: REST_APPLICATION_TAG_KEY, value: testApplicationName },
          }),
        )
        .mockReturnValue(mockOAuth2AuthenticationService);
    });

    it('should fail if a security scheme is defined at operation level but not found in application config', () => {
      const testRegistration = getPartialFixture<HttpOperationRegistration>({
        operationId: 'testOperation',
        application: {
          name: 'testApp',
          openApiConfig: {},
        },
        operationMetadata: { security: [{ nonExistentScheme: [] }] },
      });

      expect(() => subject.getOperationSecurityBindings(testRegistration)).toThrowWithMessage(
        HttpTriggerDefinitionError,
        'Security scheme nonExistentScheme not found in application testApp for operation testOperation',
      );
    });

    it(' should fail if non auth service is found for a security scheme', () => {
      const testRegistration = getPartialFixture<HttpOperationRegistration>({
        operationId: 'testOperation',
        application: {
          name: 'testApp',
          openApiConfig: {
            components: {
              securitySchemes: testSecuritySchemes,
            },
          },
        },
        operationMetadata: { security: [{ apiKeyAuth: [] }] },
      });
      mockPlatformContainer.get
        .calledWith(
          AUTHENTICATION_SERVICE,
          expect.objectContaining({
            name: 'apiKeyAuth',
            tag: { key: REST_APPLICATION_TAG_KEY, value: testRegistration.application.name },
          }),
        )
        .mockReturnValue(undefined);

      expect(() => subject.getOperationSecurityBindings(testRegistration)).toThrowWithMessage(
        HttpTriggerDefinitionError,
        'Failed resolving authentication service for scheme apiKeyAuth in application testApp',
      );
    });

    it('should return security bindings when defined at operation level', () => {
      const testRegistration = getPartialFixture<HttpOperationRegistration>({
        operationId: 'testOperation',
        application: {
          name: 'testApp',
          openApiConfig: {
            components: {
              securitySchemes: testSecuritySchemes,
            },
          },
        },
        operationMetadata: { security: testOperationSecurity },
      });
      const result = subject.getOperationSecurityBindings(testRegistration);

      expect(result).toEqual([
        {
          apiKeyAuth: {
            authService: mockApiKeyAuthenticationService,
            scopes: ['api-key:scope1', 'api-key:scope2'],
          },
        },
        {
          basicHttpAuthentication: {
            authService: mockBasicAuthenticationService,
            scopes: ['basic-http:scope1', 'basic-http:scope2'],
          },
          bearerHttpAuthentication: {
            authService: mockBearerAuthenticationService,
            scopes: ['bearer-http:scope1', 'bearer-http:scope2'],
          },
        },
      ]);
      expect(mockPlatformContainer.get).toHaveBeenCalledWith(
        AUTHENTICATION_SERVICE,
        expect.objectContaining({
          name: 'apiKeyAuth',
          tag: { key: REST_APPLICATION_TAG_KEY, value: testRegistration.application.name },
        }),
      );
      expect(mockPlatformContainer.get).toHaveBeenCalledWith(
        AUTHENTICATION_SERVICE,
        expect.objectContaining({
          name: 'basicHttpAuthentication',
          tag: { key: REST_APPLICATION_TAG_KEY, value: testRegistration.application.name },
        }),
      );
      expect(mockPlatformContainer.get).toHaveBeenCalledWith(
        AUTHENTICATION_SERVICE,
        expect.objectContaining({
          name: 'bearerHttpAuthentication',
          tag: { key: REST_APPLICATION_TAG_KEY, value: testRegistration.application.name },
        }),
      );
    });

    it('should return empty array when operation level security is empty', () => {
      const testRegistration = getPartialFixture<HttpOperationRegistration>({
        operationId: 'testOperation',
        application: {
          name: 'testApp',
          openApiConfig: {
            components: {
              securitySchemes: testSecuritySchemes,
            },
          },
        },
        operationMetadata: { security: [] },
      });
      const result = subject.getOperationSecurityBindings(testRegistration);

      expect(result).toEqual([]);
      expect(mockPlatformContainer.get).not.toHaveBeenCalledWith(AUTHENTICATION_SERVICE, expect.anything());
    });

    it('should return security bindings when defined at application level', () => {
      const testRegistration = getPartialFixture<HttpOperationRegistration>({
        operationId: 'testOperation',
        application: {
          name: 'testApp',
          openApiConfig: {
            security: testApplicationSecurity,
            components: {
              securitySchemes: testSecuritySchemes,
            },
          },
        },
        operationMetadata: {},
      });

      const result = subject.getOperationSecurityBindings(testRegistration);

      expect(result).toEqual([
        {
          apiKeyAuth: {
            authService: mockApiKeyAuthenticationService,
            scopes: ['api-key:scope1', 'api-key:scope2'],
          },
          basicHttpAuthentication: {
            authService: mockBasicAuthenticationService,
            scopes: ['basic-http:scope1', 'basic-http:scope2'],
          },
        },
        {
          bearerHttpAuthentication: {
            authService: mockBearerAuthenticationService,
            scopes: ['bearer-http:scope1', 'bearer-http:scope2'],
          },
          oauth2Profiles: {
            authService: mockOAuth2AuthenticationService,
            scopes: ['oauth2:scope1', 'oauth2:scope2'],
          },
        },
      ]);
      expect(mockPlatformContainer.get).toHaveBeenCalledWith(
        AUTHENTICATION_SERVICE,
        expect.objectContaining({
          name: 'apiKeyAuth',
          tag: { key: REST_APPLICATION_TAG_KEY, value: testRegistration.application.name },
        }),
      );
      expect(mockPlatformContainer.get).toHaveBeenCalledWith(
        AUTHENTICATION_SERVICE,
        expect.objectContaining({
          name: 'basicHttpAuthentication',
          tag: { key: REST_APPLICATION_TAG_KEY, value: testRegistration.application.name },
        }),
      );
      expect(mockPlatformContainer.get).toHaveBeenCalledWith(
        AUTHENTICATION_SERVICE,
        expect.objectContaining({
          name: 'bearerHttpAuthentication',
          tag: { key: REST_APPLICATION_TAG_KEY, value: testRegistration.application.name },
        }),
      );
      expect(mockPlatformContainer.get).toHaveBeenCalledWith(
        AUTHENTICATION_SERVICE,
        expect.objectContaining({
          name: 'oauth2Profiles',
          tag: { key: REST_APPLICATION_TAG_KEY, value: testRegistration.application.name },
        }),
      );
    });

    it('should return empty array when application level security is empty', () => {
      const testRegistration = getPartialFixture<HttpOperationRegistration>({
        operationId: 'testOperation',
        application: {
          name: 'testApp',
          openApiConfig: {
            security: [],
          },
        },
        operationMetadata: {},
      });

      const result = subject.getOperationSecurityBindings(testRegistration);

      expect(result).toEqual([]);
      expect(mockPlatformContainer.get).not.toHaveBeenCalledWith(AUTHENTICATION_SERVICE, expect.anything());
    });

    it('should return empty array when no security is defined', () => {
      const testRegistration = getPartialFixture<HttpOperationRegistration>({
        operationId: 'testOperation',
        application: {
          name: 'testApp',
          openApiConfig: {},
        },
        operationMetadata: {},
      });

      const result = subject.getOperationSecurityBindings(testRegistration);

      expect(result).toEqual([]);
      expect(mockPlatformContainer.get).not.toHaveBeenCalledWith(AUTHENTICATION_SERVICE, expect.anything());
    });
  });

  describe('defaultAuthenticator', () => {
    const testRegistration = getPartialFixture<HttpOperationRegistration>({
      operationId: 'testOperation',
    });

    it('should return a default authenticator that returns an empty object', async () => {
      const defaultAuthenticator = subject.defaultAuthenticator(testRegistration);

      const result = await defaultAuthenticator(getPartialFixture<HttpRequest>());

      expect(result).toEqual({
        principal: null,
        principals: [],
        scopes: [],
      });
    });
  });
});
