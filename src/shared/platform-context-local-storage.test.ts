import { InvocationContext } from '@azure/functions';
import { mock, MockProxy } from 'jest-mock-extended';
import { PlatformContextLocalStorage } from './platform-context-local-storage';
import { UserAccount } from './security.model';

describe('test PlatformContextLocalStorage', () => {
  let mockedContext: MockProxy<InvocationContext>;
  let mockedUserAccount: MockProxy<UserAccount>;
  let subject: PlatformContextLocalStorage;

  beforeEach(() => {
    mockedContext = mock();
    mockedUserAccount = mock();
    subject = new PlatformContextLocalStorage();
  });

  it('should return context and user if run in local storage', () => {
    subject.run({ invocationContext: mockedContext, userAccount: mockedUserAccount }, () => {
      expect(subject.invocationContext).toBe(mockedContext);
      expect(subject.userAccount).toBe(mockedUserAccount);
    });
  });
});
