import { mock, MockProxy } from 'jest-mock-extended';
import { PlatformContextLocalStorage, UserAccount } from 'shared';
import { SecurityContext } from './security-context';

describe('test SecurityContext', () => {
  let subject: SecurityContext;
  let mockContextStorage: MockProxy<PlatformContextLocalStorage>;
  let testSystemUserAccount: UserAccount;

  beforeEach(() => {
    mockContextStorage = mock<PlatformContextLocalStorage>();
    testSystemUserAccount = mock<UserAccount>();
    subject = new SecurityContext(mockContextStorage, testSystemUserAccount);
  });

  describe('test getAuthentication', () => {
    it('should return context user account if it is set in context', () => {
      const expectedAuthentication = mock<UserAccount>();
      mockContextStorage.getStore.mockReturnValue({
        userAccount: expectedAuthentication,
      });

      const actualAuthentication = subject.getAuthentication();

      expect(actualAuthentication).toBe(expectedAuthentication);
    });

    it('should return system user account if it is not set in context', () => {
      mockContextStorage.getStore.mockReturnValue({
        userAccount: undefined,
      });

      const actualAuthentication = subject.getAuthentication();

      expect(actualAuthentication).toBe(testSystemUserAccount);
    });
  });
});
