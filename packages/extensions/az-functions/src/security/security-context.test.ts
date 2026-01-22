import { PlatformContext, PlatformContextManager } from 'context';
import { mock, MockProxy } from 'jest-mock-extended';
import { SecurityContext } from './security-context';
import { AuthContext, AUTHENTICATION_CONTEXT_KEY } from './security.model';

describe('test SecurityContext', () => {
  let subject: SecurityContext;
  let mockContextManager: MockProxy<PlatformContextManager>;
  let mockContext: MockProxy<PlatformContext>;

  beforeEach(() => {
    mockContext = mock<PlatformContext>();
    mockContextManager = mock<PlatformContextManager>();
    mockContextManager.active.mockReturnValue(mockContext);
    subject = new SecurityContext(mockContextManager);
  });

  describe('test getAuthentication', () => {
    it('should return InvocationCtx AuthContext account if it is set in InvocationCtx', () => {
      const expectedAuthentication = mock<AuthContext>();
      mockContext.getValue.calledWith(AUTHENTICATION_CONTEXT_KEY).mockReturnValue(expectedAuthentication);

      const actualAuthentication = subject.getAuthentication();

      expect(actualAuthentication).toBe(expectedAuthentication);
    });

    it('should return undefined if InvocationCtx AuthContext account is not set in InvocationCtx', () => {
      mockContext.getValue.calledWith(AUTHENTICATION_CONTEXT_KEY).mockReturnValue(undefined);

      const actualAuthentication = subject.getAuthentication();

      expect(actualAuthentication).toBeUndefined();
    });
  });
});
