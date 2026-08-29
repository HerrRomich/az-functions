import { mock, MockProxy } from 'jest-mock-extended';
import { AsyncLocalStorage } from 'node:async_hooks';
import { BasePlatformContextManager } from './platform-context.manager';
import { PlatformContext } from './platform-context.model';

jest.mock('node:async_hooks', () => ({
  AsyncLocalStorage: jest.fn(),
}));

describe('BasePlatformContextManager', () => {
  let mockStorage: MockProxy<AsyncLocalStorage<any>>;
  let subject: BasePlatformContextManager;

  beforeEach(() => {
    mockStorage = mock<AsyncLocalStorage<any>>();
    jest.mocked(AsyncLocalStorage).mockReturnValue(mockStorage);
    subject = new BasePlatformContextManager();
  });

  it('should run callback with provided platform invocationContext and return its result', () => {
    const mockContext = mock<PlatformContext>();
    const mockCallBack = jest.fn(() => {
      expect(subject.active()).toBe(mockContext);
      return 'result';
    });

    mockStorage.getStore.mockReturnValue(mockContext);
    mockStorage.run.mockImplementation((_: any, callback: () => any) => callback());

    const result = subject.runWith(mockContext, mockCallBack);

    expect(mockStorage.run).toHaveBeenCalledWith(mockContext, expect.any(Function));
    expect(mockStorage.getStore).toHaveBeenCalled();
    expect(mockCallBack).toHaveBeenCalled();
    expect(result).toBe('result');
  });
});
