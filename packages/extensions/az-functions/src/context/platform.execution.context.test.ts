import { InvocationContext } from '@azure/functions';
import { mock, MockProxy } from 'jest-mock-extended';
import * as winston from 'winston';
import { createPlatformContextValueKey, PlatformContextError } from './platform-context.model';
import { ORIGINAL_INVOCATION_CONTEXT_VALUE_KEY } from './platform-context.provider';
import { PlatformExecutionContext } from './platform.execution.context';
import { WrappedInvocationContext } from './wrapped-invocation-context';

jest.mock('./wrapped-invocation-context', () => ({
  WrappedInvocationContext: jest.fn(),
}));

describe('PlatformExecutionContext', () => {
  const TEST_VALUE_KEY = createPlatformContextValueKey<string>('Test Value Key');

  let mockLogger: MockProxy<winston.Logger>;
  let mockChildLogger: MockProxy<winston.Logger>;
  let mockInvocationContext: MockProxy<InvocationContext>;
  const mockWrappedContextConstructor = jest.mocked(WrappedInvocationContext);

  beforeEach(() => {
    mockLogger = mock<winston.Logger>();
    mockChildLogger = mock<winston.Logger>();
    mockLogger.child.mockReturnValue(mockChildLogger);
    mockInvocationContext = mock<InvocationContext>();
    mockWrappedContextConstructor.mockImplementation(() => mock<WrappedInvocationContext>());
  });

  it('should create a PlatformExecutionContext with the provided invocation invocationContext and logger', () => {
    const context = new PlatformExecutionContext(mockInvocationContext, mockLogger);

    expect(context.getValue(ORIGINAL_INVOCATION_CONTEXT_VALUE_KEY)).toBe(mockInvocationContext);
    expect(context.invocationContext).toBe(mockWrappedContextConstructor.mock.results[0]!.value);
    expect(mockWrappedContextConstructor).toHaveBeenCalledWith(mockInvocationContext, mockChildLogger);
  });

  describe('methods', () => {
    let subject: PlatformExecutionContext;
    beforeEach(() => {
      subject = new PlatformExecutionContext(mockInvocationContext, mockLogger);
      mockWrappedContextConstructor.mockClear();
    });

    describe('clone', () => {
      it('should clone the PlatformExecutionContext and preserve its values', () => {
        const mockGreatChildLogger = mock<winston.Logger>();
        mockChildLogger.child.mockReturnValue(mockGreatChildLogger);

        const clonedContext = subject.clone();

        expect(clonedContext).not.toBe(subject);
        expect(clonedContext.getValue(ORIGINAL_INVOCATION_CONTEXT_VALUE_KEY)).toBe(mockInvocationContext);
        expect(clonedContext.invocationContext).toBe(mockWrappedContextConstructor.mock.results[0]!.value);
        expect(mockWrappedContextConstructor).toHaveBeenCalledWith(mockInvocationContext, mockGreatChildLogger);
      });

      it('should fail if the original invocation invocationContext is missing', () => {
        subject.deleteValue(ORIGINAL_INVOCATION_CONTEXT_VALUE_KEY);

        expect(() => subject.clone()).toThrowWithMessage(
          PlatformContextError,
          'Original invocation context is missing',
        );
      });
    });

    describe('getValue', () => {
      it('should return the value associated with the provided key', () => {
        const value = 'test-value';
        subject.setValue(TEST_VALUE_KEY, value);

        expect(subject.getValue(TEST_VALUE_KEY)).toBe(value);
      });

      it('should return undefined for a key that has not been set', () => {
        expect(subject.getValue(TEST_VALUE_KEY)).toBeUndefined();
      });
    });

    describe('setValue', () => {
      it('should set the value for the provided key and return the invocationContext', () => {
        const value = 'test-value';
        expect(subject.getValue(TEST_VALUE_KEY)).toBeUndefined();

        const returnedContext = subject.setValue(TEST_VALUE_KEY, value);

        expect(subject.getValue(TEST_VALUE_KEY)).toBe(value);
        expect(returnedContext).toBe(subject);
      });

      it('should overwrite the value for an existing key', () => {
        const initialValue = 'initial-value';
        const newValue = 'new-value';
        subject.setValue(TEST_VALUE_KEY, initialValue);

        expect(subject.getValue(TEST_VALUE_KEY)).toBe(initialValue);

        subject.setValue(TEST_VALUE_KEY, newValue);

        expect(subject.getValue(TEST_VALUE_KEY)).toBe(newValue);
      });
    });

    describe('deleteValue', () => {
      it('should delete the value for the provided key and return the invocationContext', () => {
        const value = 'test-value';
        subject.setValue(TEST_VALUE_KEY, value);

        expect(subject.getValue(TEST_VALUE_KEY)).toBe(value);

        const returnedContext = subject.deleteValue(TEST_VALUE_KEY);

        expect(subject.getValue(TEST_VALUE_KEY)).toBeUndefined();
        expect(returnedContext).toBe(subject);
      });
    });
  });
});
