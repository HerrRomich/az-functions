import { HttpRequest } from '@azure/functions';
import { DeepMockProxy, mock, mockDeep, MockProxy } from 'jest-mock-extended';
import { AuthenticationError, Principal } from 'security';
import { BearerSecurityAuthenticationService } from './bearer-security-authentication.service';
import { BearerTokenService } from './bearer-token.service';

describe('BearerSecurityAuthorizationService', () => {
  const testBearerToken = 'test-bearer-token';
  const testPrincipal: Principal = {
    subject: 'test-subject',
    type: 'test-type',
    scheme: 'test-scheme',
    scopes: ['scope1', 'scope2'],
  };

  let mockBearerTokenService: MockProxy<BearerTokenService>;
  let mockHttpRequest: DeepMockProxy<HttpRequest>;

  let subject: BearerSecurityAuthenticationService;

  beforeEach(() => {
    mockBearerTokenService = mock();
    mockBearerTokenService.getPrincipalFromToken.calledWith(testBearerToken).mockReturnValue(testPrincipal);

    mockHttpRequest = mockDeep();

    subject = new BearerSecurityAuthenticationService(mockBearerTokenService);
  });

  describe('authorize', () => {
    beforeEach(() => {
      mockHttpRequest.headers.get.calledWith('Authorization').mockReturnValue(`Bearer ${testBearerToken}`);
    });

    it('should return AuthContext account for known bearer token', async () => {
      const principal = await subject.authenticate(mockHttpRequest);

      expect(principal).toEqual(testPrincipal);
      expect(mockBearerTokenService.getPrincipalFromToken).toHaveBeenCalledWith(testBearerToken);
    });

    it.each([
      ['no authorization header', null],
      ['not bearer token', 'Not Bearer token'],
    ])('should fail if %s', async (_, authorizationHaedr) => {
      mockHttpRequest.headers.get.calledWith('Authorization').mockReturnValue(authorizationHaedr);
      await expect(subject.authenticate(mockHttpRequest)).rejects.toThrowWithMessage(
        AuthenticationError,
        'No Bearer token in Authorization header.',
      );

      expect(mockBearerTokenService.getPrincipalFromToken).not.toHaveBeenCalled();
    });
  });
});
