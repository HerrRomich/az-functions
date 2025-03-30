import { Container } from 'inversify';
import { mock, MockProxy } from 'jest-mock-extended';
import { systemUserAccount } from 'shared';
import { HttpControllerDefinitionError } from '../http-controller-platform.model';
import { AuthenticationServiceFactory } from './authentication-service.factory';
import { SECURITY_OBJECT, SecurityObject } from './model';

describe('AuthorizationServiceFactory', () => {
  const testSecurityObjects: SecurityObject[] = [
    {
      name: 'test-security1',
      scheme: {
        type: 'apiKey',
      },
      authenticate: () => Promise.resolve(systemUserAccount),
    },
    {
      name: 'test-security2',
      scheme: {
        type: 'oauth2',
      },
      authenticate: () => Promise.resolve(systemUserAccount),
    },
    {
      name: 'test-security3',
      scheme: {
        type: 'openIdConnect',
      },
      authenticate: () => Promise.resolve(systemUserAccount),
    },
  ];

  let mockPlatformContainer: MockProxy<Container>;
  let subject: AuthenticationServiceFactory;

  beforeEach(() => {
    mockPlatformContainer = mock();
    mockPlatformContainer.isBound.calledWith(SECURITY_OBJECT).mockReturnValue(true);
    mockPlatformContainer.getAll.calledWith(SECURITY_OBJECT).mockReturnValue(testSecurityObjects);

    subject = new AuthenticationServiceFactory(mockPlatformContainer);
  });

  describe('getSecurityScheme', () => {
    it('should return existing security scheme', () => {
      const securityScheme = subject.getSecurityScheme('test-security1');

      expect(securityScheme).toEqual({
        type: 'apiKey',
      });
    });

    it('should return undefined, if requested security scheme is unknown', () => {
      const securityScheme = subject.getSecurityScheme('unknown-scheme');

      expect(securityScheme).toBeUndefined();
    });
  });

  describe('getAuthorizationServices', () => {
    it('should return authorization scheme services for operation securities', () => {
      const services = subject.getAuthenticationServices({
        operationSecurities: [
          {
            'test-security1': [],
            'test-security2': [],
          },
        ],
        applicationSecurities: [
          {
            'test-security1': [],
            'test-security3': [],
          },
        ],
      });

      expect(services).toMatchObject([{ securityScheme: 'test-security1' }, { securityScheme: 'test-security2' }]);
    });

    it('should fail if one service is unknown', () => {
      expect(() =>
        subject.getAuthenticationServices({
          operationSecurities: [
            {
              'test-security1': [],
              'unknown-security': [],
            },
          ],
          applicationSecurities: [
            {
              'test-security1': [],
              'test-security3': [],
            },
          ],
        }),
      ).toThrowWithMessage(
        HttpControllerDefinitionError,
        'Security context provider "unknown-security" is not registered.',
      );
    });

    it('should return authorization scheme services for application securities, if operation securities are empty', () => {
      const services = subject.getAuthenticationServices({
        operationSecurities: [],
        applicationSecurities: [
          {
            'test-security1': [],
            'test-security3': [],
          },
        ],
      });

      expect(services).toMatchObject([{ securityScheme: 'test-security1' }, { securityScheme: 'test-security3' }]);
    });

    it('should return authorization scheme services for application securities, if operation securities not set', () => {
      expect(() =>
        subject.getAuthenticationServices({
          applicationSecurities: [
            {
              'unknown-security': [],
              'test-security3': [],
            },
          ],
        }),
      ).toThrowWithMessage(
        HttpControllerDefinitionError,
        'Security context provider "unknown-security" is not registered.',
      );
    });
  });
});
