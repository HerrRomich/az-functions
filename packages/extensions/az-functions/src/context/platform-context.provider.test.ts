import { InvocationContext } from '@azure/functions';
import { mock, MockProxy } from 'jest-mock-extended';
import * as winston from 'winston';
import { PlatformExecutionContextProvider } from './platform-context.provider';
import { PlatformExecutionContext } from './platform.execution.context';

jest.mock('./platform.execution.context');

describe('PlatformContextProvider', () => {
  let mockLogger: MockProxy<winston.Logger>;
  let subject: PlatformExecutionContextProvider;

  beforeEach(() => {
    mockLogger = mock<winston.Logger>();
    subject = new PlatformExecutionContextProvider(mockLogger);
  });

  it('should create a PlatformExecutionContext with the provided invocation invocationContext and logger', () => {
    const mockInvocationContext = mock<InvocationContext>();

    subject.providePlatformContext(mockInvocationContext);

    expect(PlatformExecutionContext).toHaveBeenCalledWith(mockInvocationContext, mockLogger);
  });
});
