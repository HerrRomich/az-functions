import { getPartialFixture } from '@utilities/test-utilities';
import { PlatformContext, PlatformContextManager } from 'context';
import { mock, mockFn, MockProxy } from 'jest-mock-extended';
import { AzFunctionsError } from 'shared';
import { LogLevelService } from './log-level.service';
import { AzFunctionsTransport } from './log-transport.service';
import { CONTEXT_LOGGER_METADATA, LogLevel } from './logger.model';
import { AnyValueMap } from './logger.utils';
import { OtelLogger } from './otel.logger';

describe('AzFunctionsTransport', () => {
  const defaultLogLevel: LogLevel = 'info';
  const testTimestamp = '2024-06-01T12:00:00Z';

  let mockNext: jest.Mock;

  let mockPlatformContextManager: MockProxy<PlatformContextManager>;
  let mockLogLevelService: MockProxy<LogLevelService>;
  let mockLogger: MockProxy<OtelLogger>;
  let subject: AzFunctionsTransport;

  beforeEach(async () => {
    mockNext = jest.fn();
    mockPlatformContextManager = mock<PlatformContextManager>();
    mockLogLevelService = mock<LogLevelService>();
    mockLogger = mock<OtelLogger>();
    mockLogLevelService.getLogLevel.mockReturnValue('silly');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('testLogger with logger', () => {
    class TestErrorClass extends AzFunctionsError {
      constructor(message?: string, options?: any) {
        super(message, options);
      }
    }

    beforeEach(() => {
      subject = new AzFunctionsTransport(mockPlatformContextManager, defaultLogLevel, mockLogger, mockLogLevelService);
    });

    it.each<{ level: LogLevel }>([
      {
        level: 'verbose',
      },
      {
        level: 'info',
      },
      {
        level: 'debug',
      },
      {
        level: 'warn',
      },
      {
        level: 'error',
      },
    ])('should call platform logger with $level', async ({ level }) => {
      let resolveLogged: (arg: unknown) => void;
      const loggedPromise = new Promise<unknown>(resolve => {
        resolveLogged = resolve;
      });
      subject.once('logged', info => {
        resolveLogged(info);
      });

      subject.log(
        {
          level,
          message: 'Message',
          metadata: {
            timestamp: testTimestamp,
            loggerName: 'loggerName',
            stack: 'Stack trace',
          },
        },
        mockNext,
      );
      const info = await loggedPromise;

      expect(mockLogger.log).toHaveBeenCalledWith({
        timestamp: new Date(testTimestamp),
        level,
        message: 'Message',
        loggerName: 'loggerName',
        metadata: { stack: 'Stack trace' },
      });
      expect(mockNext).toHaveBeenCalled();
      expect(info).toEqual({
        level,
        message: 'Message',
        metadata: { timestamp: testTimestamp, loggerName: 'loggerName', stack: 'Stack trace' },
      });
    });

    it('should log with unknown level', () => {
      mockLogLevelService.getLogLevel.mockReturnValue(defaultLogLevel);
      subject.log(
        {
          level: 'unknown',
          message: 'This is an info Message',
          metadata: {
            timestamp: testTimestamp,
            loggerName: 'loggerName',
            testProperty: 'testValue',
          },
        },
        mockNext,
      );

      expect(mockLogger.log).toHaveBeenCalledWith({
        timestamp: new Date(testTimestamp),
        level: defaultLogLevel,
        message: 'This is an info Message',
        loggerName: 'loggerName',
        metadata: {
          testProperty: 'testValue',
        },
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should log with no loggerName', () => {
      subject.log(
        {
          level: 'info',
          message: 'This is an info Message',
          metadata: {
            timestamp: testTimestamp,
            testProperty: 'testValue',
          },
        },
        mockNext,
      );

      expect(mockLogger.log).toHaveBeenCalledWith({
        timestamp: new Date(testTimestamp),
        level: 'info',
        message: 'This is an info Message',
        loggerName: 'unknown',
        metadata: { testProperty: 'testValue' },
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should log with no metadata', () => {
      subject.log(
        {
          level: 'info',
          message: 'This is an info Message',
          metadata: {
            timestamp: testTimestamp,
            loggerName: 'loggerName',
          },
        },
        mockNext,
      );

      expect(mockLogger.log).toHaveBeenCalledWith({
        timestamp: new Date(testTimestamp),
        level: 'info',
        message: 'This is an info Message',
        loggerName: 'loggerName',
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should not log if below available log level', () => {
      mockLogLevelService.getLogLevel.mockReturnValue('error');

      subject.log(
        {
          level: 'info',
          message: 'This is an info Message',
          metadata: {
            timestamp: testTimestamp,
            loggerName: 'loggerName',
          },
        },
        mockNext,
      );

      expect(mockLogger.log).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should log with nested causes', () => {
      subject.log(
        {
          level: 'error',
          message: 'This is an error Message',
          metadata: {
            timestamp: testTimestamp,
            loggerName: 'loggerName',
            name: 'TestError',
            message: 'This is an error Message',
            stack: 'Top level stack trace',
            details: { key1: 'value1' },
            cause: new TestErrorClass('Inner error', {
              details: { key2: 'value2' },
              cause: new Error('Innermost error'),
            }),
          },
        },
        mockNext,
      );

      expect(mockLogger.log).toHaveBeenCalledWith({
        timestamp: new Date(testTimestamp),
        level: 'error',
        message: 'This is an error Message',
        loggerName: 'loggerName',
        metadata: {
          name: 'TestError',
          message: 'This is an error Message',
          stack: 'Top level stack trace',
          details: { key1: 'value1' },
          cause: {
            name: 'TestErrorClass',
            message: 'Inner error',
            stack: expect.toStartWith('TestErrorClass: Inner error'),
            details: { key2: 'value2' },
            cause: {
              name: 'Error',
              message: 'Innermost error',
              stack: expect.toStartWith('Error: Innermost error'),
            },
          },
        },
      });
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('testLogger with invocation InvocationCtx', () => {
    beforeEach(() => {
      mockPlatformContextManager.active.mockReturnValue(
        getPartialFixture<PlatformContext>({
          invocationContext: {
            functionName: 'test-function-name',
            invocationId: 'test-invocation-id',
            traceContext: {
              traceParent: '00-testtraceparent',
              traceState: 'testtracestate',
            },
          },
          getValue: mockFn()
            .calledWith(CONTEXT_LOGGER_METADATA)
            .mockReturnValue({
              error: {
                errorExtraKey1: 'errorExtraValue1',
                errorExtraKey2: 'errorExtraValue2',
              },
              warn: {
                warnExtraKey1: 'warnExtraValue1',
                warnExtraKey2: 'warnExtraValue2',
              },
              info: {
                infoExtraKey1: 'infoExtraValue1',
                infoExtraKey2: 'infoExtraValue2',
              },
              debug: { debugExtraKey1: 'debugExtraValue1', debugExtraKey2: 'debugExtraValue2' },
            }),
        }),
      );
      subject = new AzFunctionsTransport(mockPlatformContextManager, defaultLogLevel, mockLogger, mockLogLevelService);
    });

    it.each<{ level: LogLevel; metaAdjustment: AnyValueMap }>([
      {
        level: 'silly',
        metaAdjustment: { debugExtraKey1: 'debugExtraValue1', debugExtraKey2: 'debugExtraValue2' },
      },
      {
        level: 'debug',
        metaAdjustment: { debugExtraKey1: 'debugExtraValue1', debugExtraKey2: 'debugExtraValue2' },
      },
      {
        level: 'verbose',
        metaAdjustment: { infoExtraKey1: 'infoExtraValue1', infoExtraKey2: 'infoExtraValue2' },
      },
      {
        level: 'http',
        metaAdjustment: { infoExtraKey1: 'infoExtraValue1', infoExtraKey2: 'infoExtraValue2' },
      },
      {
        level: 'info',
        metaAdjustment: { infoExtraKey1: 'infoExtraValue1', infoExtraKey2: 'infoExtraValue2' },
      },
      {
        level: 'warn',
        metaAdjustment: { warnExtraKey1: 'warnExtraValue1', warnExtraKey2: 'warnExtraValue2' },
      },
      {
        level: 'error',
        metaAdjustment: { errorExtraKey1: 'errorExtraValue1', errorExtraKey2: 'errorExtraValue2' },
      },
    ])('should call platform logger with $level', async ({ level, metaAdjustment }) => {
      let resolveLogged: (arg: unknown) => void;
      const loggedPromise = new Promise<unknown>(resolve => {
        resolveLogged = resolve;
      });
      subject.once('logged', info => {
        resolveLogged(info);
      });

      subject.log(
        {
          level,
          message: 'Message',
          metadata: {
            timestamp: testTimestamp,
            loggerName: 'loggerName',
            stack: 'Stack trace',
          },
        },
        mockNext,
      );
      const info = await loggedPromise;

      expect(mockLogger.log).toHaveBeenCalledWith({
        timestamp: new Date(testTimestamp),
        operationName: 'test-function-name',
        invocationId: 'test-invocation-id',
        traceContext: {
          traceParent: '00-testtraceparent',
          traceState: 'testtracestate',
        },
        level,
        message: 'Message',
        loggerName: 'loggerName',
        metadata: {
          ...metaAdjustment,
          stack: 'Stack trace',
        },
      });
      expect(mockNext).toHaveBeenCalled();
      expect(info).toEqual({
        level,
        message: 'Message',
        metadata: { timestamp: testTimestamp, loggerName: 'loggerName', stack: 'Stack trace' },
      });
    });

    it('should not log if below available log level', () => {
      mockLogLevelService.getLogLevel.mockReturnValue('error');

      subject.log(
        {
          level: 'info',
          message: 'This is an info Message',
          metadata: {
            timestamp: testTimestamp,
            loggerName: 'loggerName',
          },
        },
        mockNext,
      );

      expect(mockLogger.log).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should log with nested causes', () => {
      subject.log(
        {
          level: 'error',
          message: 'This is an error Message',
          metadata: {
            timestamp: testTimestamp,
            loggerName: 'loggerName',
            name: 'Error',
            message: 'This is an error Message',
            stack: 'Top level stack trace',
            cause: new Error('Inner error', { cause: new Error('Innermost error') }),
          },
        },
        mockNext,
      );

      expect(mockLogger.log).toHaveBeenCalledWith({
        timestamp: new Date(testTimestamp),
        operationName: 'test-function-name',
        invocationId: 'test-invocation-id',
        traceContext: {
          traceParent: '00-testtraceparent',
          traceState: 'testtracestate',
        },
        loggerName: 'loggerName',
        level: 'error',
        message: 'This is an error Message',
        metadata: {
          errorExtraKey1: 'errorExtraValue1',
          errorExtraKey2: 'errorExtraValue2',
          name: 'Error',
          message: 'This is an error Message',
          stack: 'Top level stack trace',
          cause: {
            name: 'Error',
            message: 'Inner error',
            stack: expect.toStartWith('Error: Inner error'),
            cause: {
              name: 'Error',
              message: 'Innermost error',
              stack: expect.toStartWith('Error: Innermost error'),
            },
          },
        },
      });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should log with nested cause not error', () => {
      subject.log(
        {
          level: 'error',
          message: 'This is an error Message',
          metadata: {
            timestamp: testTimestamp,
            loggerName: 'loggerName',
            stack: 'Top level stack trace',
            cause: { some: 'non-error cause' },
          },
        },
        mockNext,
      );

      expect(mockLogger.log).toHaveBeenCalledWith({
        timestamp: new Date(testTimestamp),
        operationName: 'test-function-name',
        invocationId: 'test-invocation-id',
        traceContext: {
          traceParent: '00-testtraceparent',
          traceState: 'testtracestate',
        },
        loggerName: 'loggerName',
        level: 'error',
        message: 'This is an error Message',
        metadata: {
          errorExtraKey1: 'errorExtraValue1',
          errorExtraKey2: 'errorExtraValue2',
          stack: 'Top level stack trace',
          cause: {
            some: 'non-error cause',
          },
        },
      });
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('testLogger without platform logger', () => {
    const mockConsoleLog = jest.fn();
    const mockConsoleError = jest.fn();
    const mockConsoleWarn = jest.fn();
    const mockConsoleInfo = jest.fn();
    const mockConsoleDebug = jest.fn();
    beforeEach(() => {
      subject = new AzFunctionsTransport(mockPlatformContextManager, defaultLogLevel, undefined, mockLogLevelService);

      global.console = {
        log: mockConsoleLog,
        error: mockConsoleError,
        warn: mockConsoleWarn,
        info: mockConsoleInfo,
        debug: mockConsoleDebug,
      } as any;
    });

    it.each<{ level: LogLevel; consoleMethod: (typeof console)[keyof typeof console] }>([
      {
        level: 'verbose',
        consoleMethod: mockConsoleInfo,
      },
      {
        level: 'info',
        consoleMethod: mockConsoleInfo,
      },
      {
        level: 'debug',
        consoleMethod: mockConsoleDebug,
      },
      {
        level: 'warn',
        consoleMethod: mockConsoleWarn,
      },
      {
        level: 'error',
        consoleMethod: mockConsoleError,
      },
    ])('should call console logger with $level', async ({ level, consoleMethod }) => {
      let resolveLogged: (arg: unknown) => void;
      const loggedPromise = new Promise<unknown>(resolve => {
        resolveLogged = resolve;
      });
      subject.once('logged', info => {
        resolveLogged(info);
      });

      subject.log(
        {
          level,
          message: 'Message',
          metadata: {
            timestamp: testTimestamp,
            loggerName: 'loggerName',
            extraKey1: 'extraValue1',
            extraKey2: 'extraValue2',
            stack: 'Stack trace',
          },
        },
        mockNext,
      );
      const info = await loggedPromise;

      expect(consoleMethod).toHaveBeenCalledWith('Message', {
        extraKey1: 'extraValue1',
        extraKey2: 'extraValue2',
        stack: 'Stack trace',
      });
      expect(mockNext).toHaveBeenCalled();
      expect(info).toEqual({
        level,
        message: 'Message',
        metadata: {
          timestamp: testTimestamp,
          loggerName: 'loggerName',
          extraKey1: 'extraValue1',
          extraKey2: 'extraValue2',
          stack: 'Stack trace',
        },
      });
    });
  });

  describe('log level filtering', () => {
    beforeEach(() => {
      mockLogLevelService.getLogLevel.mockReturnValue('info');
      subject = new AzFunctionsTransport(mockPlatformContextManager, defaultLogLevel, undefined, mockLogLevelService);
    });

    it('should not log Messages below the set log level', () => {
      subject.log(
        {
          level: 'debug',
          message: 'This is a debug Message',
          metadata: {
            timestamp: testTimestamp,
            loggerName: 'loggerName',
          },
        },
        mockNext,
      );

      expect(mockLogger.log).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });

    it('should log Messages at or above the set log level', () => {
      subject.log(
        {
          level: 'error',
          message: 'This is an error Message',
          metadata: {
            timestamp: testTimestamp,
            loggerName: 'loggerName',
          },
        },
        mockNext,
      );

      expect(mockLogger.log).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
    });
  });
});
