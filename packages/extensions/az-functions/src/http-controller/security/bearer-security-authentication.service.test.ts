import { HttpRequest } from '@azure/functions';
import { DeepMockProxy, mock, mockDeep, MockProxy } from 'jest-mock-extended';
import { UserAccount } from 'shared';
import { BearerSecurityAuthenticationService } from './bearer-security-authentication.service';
import { BearerTokenService } from './bearer-token.service';
import { AuthenticationError } from './model';

describe('BearerSecurityAuthorizationService', () => {
  const testBearerToken = 'test-bearer-token';
  const testUserAccountId = 'f5cafe6f-e065-46de-8b1c-00a2abcc9bf0';
  const testUserAccount = {
    id: testUserAccountId,
  } as unknown as UserAccount;

  let mockBearerTokenService: MockProxy<BearerTokenService>;
  let mockHttpRequest: DeepMockProxy<HttpRequest>;

  let subject: BearerSecurityAuthenticationService;

  beforeEach(() => {
    mockBearerTokenService = mock();
    mockBearerTokenService.getUserAccountFromToken.calledWith(testBearerToken).mockReturnValue(testUserAccount);

    mockHttpRequest = mockDeep();

    subject = new BearerSecurityAuthenticationService(mockBearerTokenService);
  });

  describe('authorize', () => {
    beforeEach(() => {
      mockHttpRequest.headers.get.calledWith('Authorization').mockReturnValue(`Bearer ${testBearerToken}`);
    });

    it('should return user account for known bearer token', async () => {
      const authorizedAccount = await subject.authenticate(mockHttpRequest);

      expect(authorizedAccount).toEqual(testUserAccount);
      expect(mockBearerTokenService.getUserAccountFromToken).toHaveBeenCalledWith(testBearerToken);
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

      expect(mockBearerTokenService.getUserAccountFromToken).not.toHaveBeenCalled();
    });
  });
});
