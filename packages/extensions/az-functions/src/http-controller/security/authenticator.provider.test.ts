import { HttpRequest } from '@azure/functions';
import { AuthenticationService, ForbiddenError, UnauthorizedError } from 'http-controller';
import { mock, mockFn, MockProxy } from 'jest-mock-extended';
import { Logger } from 'logger';
import { AuthContext, AuthenticationError, Principal } from 'security';
import { getPartialFixture } from 'test-utilities';
import { HttpOperationRegistration } from '../http-operations-registration.service';
import { AuthenticationHandler, AuthenticatorProvider } from './authenticator.provider';
import { OperationAuthenticationResolver, SecurityBindingObject } from './operation-authentication.resolver';
import { FallbackPrincipalMergeService } from './principal-merge.service';

describe('AuthenticatorProvider', () => {
  let mockAuthenticationResolver: MockProxy<OperationAuthenticationResolver>;
  let mockPrincipalMergeService: MockProxy<FallbackPrincipalMergeService>;

  let subject: AuthenticatorProvider;

  beforeEach(() => {
    mockAuthenticationResolver = mock<OperationAuthenticationResolver>();
    mockPrincipalMergeService = mock<FallbackPrincipalMergeService>();

    subject = new AuthenticatorProvider(() => mock<Logger>(), mockAuthenticationResolver, mockPrincipalMergeService);
  });

  describe('provideAuthenticator', () => {
    const testRegistrationData = getPartialFixture<HttpOperationRegistration>({
      operationId: 'testOperation',
    });

    it('should return default authenticator when no security requirements are provided', () => {
      const mockDefaultAuthenticator = mockFn<AuthenticationHandler>();
      mockAuthenticationResolver.getOperationSecurityBindings.calledWith(testRegistrationData).mockReturnValue([]);
      mockAuthenticationResolver.defaultAuthenticator
        .calledWith(testRegistrationData)
        .mockReturnValue(mockDefaultAuthenticator);

      const result = subject.provideAuthenticator(testRegistrationData);

      expect(result).toBe(mockDefaultAuthenticator);
    });

    it('should return a security authenticator when security requirements are provided', () => {
      mockAuthenticationResolver.getOperationSecurityBindings.calledWith(testRegistrationData).mockReturnValue(
        getPartialFixture<SecurityBindingObject[]>([
          {
            testScheme11: {
              authService: mock<AuthenticationService>(),
              scopes: ['scope1', 'scope2'],
            },
          },
        ]),
      );

      const result = subject.provideAuthenticator(testRegistrationData);

      expect(result).toBeFunction();
    });

    describe('security authenticator', () => {
      const mockAuthContext = getPartialFixture<AuthContext>();

      let auth11: MockProxy<AuthenticationService>;
      let auth12: MockProxy<AuthenticationService>;
      let auth21: MockProxy<AuthenticationService>;
      let auth22: MockProxy<AuthenticationService>;
      let testAuthBinding: SecurityBindingObject[];

      let securityAuthenticator: AuthenticationHandler;
      const mockRequest = mock<HttpRequest>();

      beforeEach(() => {
        auth11 = mock<AuthenticationService>();
        auth11.authenticate.mockResolvedValue(
          getPartialFixture<Principal>({
            scopes: ['scope1', 'scope2'],
          }),
        );
        auth12 = mock<AuthenticationService>();
        auth12.authenticate.mockResolvedValue(
          getPartialFixture<Principal>({
            scopes: ['scope3'],
          }),
        );
        auth21 = mock<AuthenticationService>();
        auth21.authenticate.mockResolvedValue(
          getPartialFixture<Principal>({
            scopes: ['scope4'],
          }),
        );
        auth22 = mock<AuthenticationService>();
        auth22.authenticate.mockResolvedValue(
          getPartialFixture<Principal>({
            scopes: ['scope5', 'scope6'],
          }),
        );
        testAuthBinding = [
          {
            testScheme11: {
              authService: auth11,
              scopes: ['scope1', 'scope2'],
            },
            testScheme12: {
              authService: auth12,
              scopes: ['scope3'],
            },
          },
          {
            testScheme21: {
              authService: auth21,
              scopes: ['scope4'],
            },
            testScheme22: {
              authService: auth22,
              scopes: ['scope5', 'scope6'],
            },
          },
        ];

        mockAuthenticationResolver.getOperationSecurityBindings
          .calledWith(testRegistrationData)
          .mockReturnValue(testAuthBinding);

        mockPrincipalMergeService.mergePrincipals.mockReturnValue(mockAuthContext);

        securityAuthenticator = subject.provideAuthenticator(testRegistrationData);
      });

      it('should authenticate using the first successful security requirement', async () => {
        const result = await securityAuthenticator(mockRequest);

        expect(result).toBe(mockAuthContext);
      });

      it('should fail authentication if first security requirement fails', async () => {
        auth11.authenticate.mockResolvedValue(
          getPartialFixture<Principal>({
            scopes: [],
          }),
        );
        const error = new Error('auth12 failed');
        auth12.authenticate.mockRejectedValue(error);

        await expect(securityAuthenticator(mockRequest)).rejects.toThrow(error);
      });

      it('should throw AuthenticationError if all security requirements fail', async () => {
        auth11.authenticate.mockRejectedValue(new AuthenticationError('auth11 failed'));
        auth22.authenticate.mockRejectedValue(new AuthenticationError('auth22 failed'));

        await expect(securityAuthenticator(mockRequest)).rejects.toThrowWithMessage(
          UnauthorizedError,
          'Authentication failed',
        );
      });

      it('should throw ForbiddenError if first successful authentication does not have required scopes', async () => {
        auth11.authenticate.mockResolvedValue(
          getPartialFixture<Principal>({
            scopes: ['scope1'], // Missing 'scope2'
          }),
        );

        await expect(securityAuthenticator(mockRequest)).rejects.toThrowWithMessage(
          ForbiddenError,
          'Authorization failed',
        );
      });

      it('should throw ForbiddenError if second successful authentication does not have required scopes', async () => {
        auth12.authenticate.mockRejectedValue(new AuthenticationError('auth12 failed'));
        auth22.authenticate.mockResolvedValue(
          getPartialFixture<Principal>({
            scopes: ['scope4'], // Missing 'scope5' and 'scope6'
          }),
        );

        await expect(securityAuthenticator(mockRequest)).rejects.toThrowWithMessage(
          ForbiddenError,
          'Authorization failed',
        );
      });
    });
  });
});
