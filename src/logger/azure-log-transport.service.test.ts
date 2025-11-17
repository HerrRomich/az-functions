import { InvocationContext } from '@azure/functions';
import { mock, MockProxy } from 'jest-mock-extended';
import { PlatformContextLocalStorage } from 'shared';
import { LEVEL } from 'triple-beam';
import { AzureLogTransport } from './azure-log-transport.service';
import { ILogLevelService } from './log-level.service';
import { ILogger } from './logger.model';
import { PlatformLogger } from './platform.logger';

describe('AzureLogTransport', () => {
  let mockNext: jest.Mock;

  let mockPlatformLogger: MockProxy<PlatformLogger>;
  let mockLogLevelService: MockProxy<ILogLevelService>;
  let subject: AzureLogTransport;

  beforeEach(async () => {
    mockNext = jest.fn();
    mockPlatformLogger = mock();
    mockLogLevelService = mock();
    mockLogLevelService.getLogLevel.mockReturnValue('verbose');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('testLogger without invocation context', () => {
    beforeEach(() => {
      const mockContextStorage = mock<PlatformContextLocalStorage>();
      mockContextStorage.getStore.mockReturnValue({
        invocationContext: undefined,
      });

      subject = new AzureLogTransport(mockContextStorage, mockPlatformLogger, mockLogLevelService);
    });

    it.each<[string, string, keyof ILogger]>([
      ['platformLogger.log', 'unknown', 'info'],
      ['platformLogger.trace', 'verbose', 'trace'],
      ['platformLogger.info', 'info', 'info'],
      ['platformLogger.debug', 'debug', 'debug'],
      ['platformLogger.warn', 'warn', 'warn'],
      ['platformLogger.error', 'error', 'error'],
    ])('should call %s for log level %s', async (_, level, method) => {
      let resolveLogged: (arg: any) => void;
      const loggedPromise = new Promise<any>(resolve => {
        resolveLogged = resolve;
      });
      subject.once('logged', info => {
        resolveLogged(info);
      });

      subject.log(
        {
          [LEVEL]: level,
          category: 'category',
          message: 'Message',
          stack: 'Stack trace',
        },
        mockNext,
      );
      const info = await loggedPromise;

      expect(mockPlatformLogger[method]).toHaveBeenCalledWith({
        message: 'Message',
        category: 'category',
        stack: 'Stack trace',
      });
      expect(mockNext).toHaveBeenCalled();
      expect(info).toEqual({ [LEVEL]: level, category: 'category', message: 'Message', stack: 'Stack trace' });
    });
  });

  describe('testLogger with invocation context', () => {
    let mockContext: MockProxy<InvocationContext>;

    beforeEach(() => {
      const mockContextStorage = mock<PlatformContextLocalStorage>();
      mockContext = mock<InvocationContext>();
      mockContextStorage.getStore.mockReturnValue({
        invocationContext: mockContext,
      });
      subject = new AzureLogTransport(mockContextStorage, mockPlatformLogger, mockLogLevelService);
    });

    it.each<[string, string, keyof ILogger]>([
      ['context.info', 'unknown', 'info'],
      ['context.trace', 'verbose', 'trace'],
      ['context.info', 'info', 'info'],
      ['context.debug', 'debug', 'debug'],
      ['context.warn', 'warn', 'warn'],
      ['context.error', 'error', 'error'],
    ])('should call %s for log level %s', async (_, level, method) => {
      let resolveLogged: (arg: any) => void;
      const loggedPromise = new Promise<any>(resolve => {
        resolveLogged = resolve;
      });
      subject.once('logged', info => {
        resolveLogged(info);
      });

      subject.log(
        {
          [LEVEL]: level,
          category: 'category',
          message: 'Message',
          stack: 'Stack trace',
        },
        mockNext,
      );
      const info = await loggedPromise;

      expect(mockContext[method]).toHaveBeenCalledWith({
        message: 'Message',
        category: 'category',
        stack: 'Stack trace',
      });
      expect(mockNext).toHaveBeenCalled();
      expect(info).toEqual({ [LEVEL]: level, category: 'category', message: 'Message', stack: 'Stack trace' });
    });
  });

  describe('log level filtering', () => {
    beforeEach(() => {
      const mockContextStorage = mock<PlatformContextLocalStorage>();
      mockContextStorage.getStore.mockReturnValue({
        invocationContext: undefined,
      });
      mockLogLevelService.getLogLevel.mockReturnValue('info');
      subject = new AzureLogTransport(mockContextStorage, mockPlatformLogger, mockLogLevelService);
    });

    it('should not log messages below the set log level', () => {
      subject.log(
        {
          [LEVEL]: 'debug',
          category: 'category',
          message: 'This is a debug message',
        },
        mockNext,
      );

      expect(mockPlatformLogger.debug).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should log messages at or above the set log level', () => {
      subject.log(
        {
          [LEVEL]: 'error',
          category: 'category',
          message: 'This is an error message',
        },
        mockNext,
      );

      expect(mockPlatformLogger.error).toHaveBeenCalledWith({
        message: 'This is an error message',
        category: 'category',
      });
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
