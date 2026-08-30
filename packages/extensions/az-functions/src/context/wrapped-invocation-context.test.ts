import { InvocationContext } from '@azure/functions';
import { mock, MockProxy } from 'jest-mock-extended';
import { getPartialFixture } from 'test-utilities';
import * as winston from 'winston';
import { WrappedInvocationContext } from './wrapped-invocation-context';

describe('WrappedInvocationContext', () => {
  const testParentInvocationContext = getPartialFixture<InvocationContext>({
    invocationId: 'test-invocation-id',
    functionName: 'test-function-name',
  });

  let subject: WrappedInvocationContext;
  let mockLogger: MockProxy<winston.Logger>;

  beforeEach(() => {
    mockLogger = mock<winston.Logger>();
    subject = new WrappedInvocationContext(testParentInvocationContext, mockLogger);
  });

  it('should have same properties as parent invocation InvocationCtx', () => {
    expect(subject.invocationId).toBe(testParentInvocationContext.invocationId);
    expect(subject.functionName).toBe(testParentInvocationContext.functionName);
  });

  it('should log Messages using provided logger', () => {
    const testMessage = 'Test log Message';
    const testMeta = { key: 'value' };

    subject.info(testMessage, testMeta);

    expect(mockLogger.log).toHaveBeenCalledWith('info', testMessage, testMeta);
  });
});
