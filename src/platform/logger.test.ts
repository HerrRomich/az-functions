import { InvocationContext } from '@azure/functions';
import { mock, MockProxy } from 'jest-mock-extended';
import { PlatformContextLocalStorage } from '../shared/platform-context-local-storage';
import { AzureLogTransporter } from './logger';

describe('test AzureLogTransporter', () => {
  let mockNext: jest.Mock;

  let subject: AzureLogTransporter;

  beforeEach(async () => {
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('testLogger without invocation context', () => {
    let storedConsole: typeof global.console;
    let mockedConsole: MockProxy<typeof global.console>;

    beforeEach(() => {
      const mockedContextStorage = mock<PlatformContextLocalStorage>();
      mockedContextStorage.getStore.mockReturnValue({
        invocationContext: undefined,
      });
      mockedConsole = mock<typeof global.console>();
      storedConsole = global.console;
      global.console = mockedConsole;
      subject = new AzureLogTransporter(mockedContextStorage);
    });

    afterEach(() => {
      global.console = storedConsole;
    });

    it.each([
      ['console.log', 'unknown', () => mockedConsole.log],
      ['console.trace', 'trace', () => mockedConsole.trace],
      ['console.info', 'info', () => mockedConsole.info],
      ['console.debug', 'debug', () => mockedConsole.debug],
      ['console.warn', 'warn', () => mockedConsole.warn],
      ['console.error', 'error', () => mockedConsole.error],
    ])('should call %s', (_, level, methodReceiver) => {
      subject.log(
        {
          level,
          message: 'Message',
          param1: {
            key: 'key',
            value: 'value',
          },
        },
        mockNext,
      );

      expect(methodReceiver()).toHaveBeenCalledWith({
        message: 'Message',
        param1: { key: 'key', value: 'value' },
      });
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('testLogger with invocation context', () => {
    let mockedContext: MockProxy<InvocationContext>;

    beforeEach(() => {
      const mockedContextStorage = mock<PlatformContextLocalStorage>();
      mockedContext = mock<InvocationContext>();
      mockedContextStorage.getStore.mockReturnValue({
        invocationContext: mockedContext,
      });
      subject = new AzureLogTransporter(mockedContextStorage);
    });

    it.each([
      ['context.log', 'unknown', () => mockedContext.log],
      ['context.trace', 'trace', () => mockedContext.trace],
      ['context.info', 'info', () => mockedContext.info],
      ['context.debug', 'debug', () => mockedContext.debug],
      ['context.warn', 'warn', () => mockedContext.warn],
      ['context.error', 'error', () => mockedContext.error],
    ])('should call %s', (_, level, methodReceiver) => {
      subject.log(
        {
          level,
          message: 'Message',
          param1: {
            key: 'key',
            value: 'value',
          },
        },
        mockNext,
      );

      expect(methodReceiver()).toHaveBeenCalledWith({
        message: 'Message',
        param1: { key: 'key', value: 'value' },
      });
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
