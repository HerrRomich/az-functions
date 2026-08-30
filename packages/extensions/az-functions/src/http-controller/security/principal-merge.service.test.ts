import { mock, MockProxy } from 'jest-mock-extended';
import { Principal } from 'security';
import { getPartialFixture } from 'test-utilities';
import { FallbackPrincipalMergeService, PrincipalMergeService } from './principal-merge.service';

describe('FallbackPrincipalMergeService', () => {
  const testPrincipal1 = getPartialFixture<Principal>({
    subject: 'user1',
    type: 'user',
    scheme: 'scheme1',
    scopes: ['scope1', 'scope2'],
  });
  const testPrincipal2 = getPartialFixture<Principal>({
    subject: 'device1',
    type: 'device',
    scheme: 'scheme2',
    scopes: ['scope2', 'scope3'],
  });
  const testAuthContext = {
    principal: testPrincipal1,
    principals: [testPrincipal1, testPrincipal2],
    scopes: ['scope1', 'scope2', 'scope3'],
  };

  let subject: FallbackPrincipalMergeService;
  let mockDefaultMergeService: MockProxy<PrincipalMergeService>;

  beforeEach(() => {
    mockDefaultMergeService = mock<PrincipalMergeService>();
  });

  describe('without optional merge service', () => {
    beforeEach(() => {
      subject = new FallbackPrincipalMergeService(mockDefaultMergeService, undefined);
    });

    describe('mergePrincipals', () => {
      it('should merge principals with unique scopes', () => {
        mockDefaultMergeService.mergePrincipals
          .calledWith(expect.arrayContaining([testPrincipal1, testPrincipal2]))
          .mockReturnValue(testAuthContext);

        const authContext = subject.mergePrincipals([testPrincipal1, testPrincipal2]);

        expect(authContext).toEqual(testAuthContext);
        expect(mockDefaultMergeService.mergePrincipals).toHaveBeenCalledWith([testPrincipal1, testPrincipal2]);
      });
    });
  });

  describe('with optional merge service', () => {
    let mockOptionalMergeService: MockProxy<PrincipalMergeService>;

    beforeEach(() => {
      mockOptionalMergeService = mock<PrincipalMergeService>();
      subject = new FallbackPrincipalMergeService(mockDefaultMergeService, mockOptionalMergeService);
    });

    describe('mergePrincipals', () => {
      it('should use the optional merge service when provided', () => {
        mockOptionalMergeService.mergePrincipals
          .calledWith(expect.arrayContaining([testPrincipal1, testPrincipal2]))
          .mockReturnValue(testAuthContext);

        const authContext = subject.mergePrincipals([testPrincipal1, testPrincipal2]);

        expect(authContext).toEqual(testAuthContext);
        expect(mockOptionalMergeService.mergePrincipals).toHaveBeenCalledWith([testPrincipal1, testPrincipal2]);
        expect(mockDefaultMergeService.mergePrincipals).not.toHaveBeenCalled();
      });
    });
  });
});
