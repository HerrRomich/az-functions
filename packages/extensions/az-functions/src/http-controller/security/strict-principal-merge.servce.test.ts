import { getPartialFixture } from '@utilities/test-utilities';
import { AuthenticationError, Principal } from 'security';
import { StrictPrincipalMergeService } from './strict-principal-merge.servce';

describe('StrictPrincipalMergeService', () => {
  let subject: StrictPrincipalMergeService;

  beforeEach(() => {
    subject = new StrictPrincipalMergeService();
  });

  describe('mergePrincipals', () => {
    it('should merge principals with unique scopes', () => {
      const principal1 = getPartialFixture<Principal>({
        subject: 'user1',
        type: 'user',
        scheme: 'scheme1',
        scopes: ['scope1', 'scope2'],
      });
      const principal2 = getPartialFixture<Principal>({
        subject: 'user1',
        type: 'user',
        scheme: 'scheme2',
        scopes: ['scope2', 'scope3'],
      });

      const authContext = subject.mergePrincipals([principal1, principal2]);

      expect(authContext).toEqual({
        principal: {
          subject: 'user1',
          type: 'user',
          scheme: 'scheme1',
          scopes: ['scope1', 'scope2'],
        },
        principals: [principal1, principal2],
        scopes: ['scope1', 'scope2', 'scope3'],
      });
    });

    it('should return null if no principals are provided', () => {
      const authContext = subject.mergePrincipals([]);
      expect(authContext).toEqual({
        principal: null,
        principals: [],
        scopes: [],
      });
    });

    it('should throw an error if principals have different subjects', () => {
      const principal1 = getPartialFixture<Principal>({
        subject: 'user1',
        type: 'user',
        scheme: 'scheme1',
        scopes: ['scope1', 'scope2'],
      });
      const principal2 = getPartialFixture<Principal>({
        subject: 'user2',
        type: 'user',
        scheme: 'scheme2',
        scopes: ['scope2', 'scope3'],
      });

      expect(() => subject.mergePrincipals([principal1, principal2])).toThrowWithMessage(
        AuthenticationError,
        'AuthContext subject or type mismatch during merge',
      );
    });

    it('should throw an error if principals have different types', () => {
      const principal1 = getPartialFixture<Principal>({
        subject: 'user1',
        type: 'user',
        scheme: 'scheme1',
        scopes: ['scope1', 'scope2'],
      });
      const principal2 = getPartialFixture<Principal>({
        subject: 'user1',
        type: 'admin',
        scheme: 'scheme2',
        scopes: ['scope2', 'scope3'],
      });

      expect(() => subject.mergePrincipals([principal1, principal2])).toThrowWithMessage(
        AuthenticationError,
        'AuthContext subject or type mismatch during merge',
      );
    });
  });
});
