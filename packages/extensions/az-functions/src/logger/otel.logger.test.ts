import { TraceContext } from '@azure/functions';
import { Context, ROOT_CONTEXT, trace } from '@opentelemetry/api';
import { Logger } from '@opentelemetry/api-logs';
import { LoggerProvider } from '@opentelemetry/sdk-logs';
import { mock, MockProxy } from 'jest-mock-extended';
import { getPartialFixture } from 'test-utilities';
import { PlatformLogInfo } from './logger.model';
import { OtelLogger } from './otel.logger';

jest.mock('@opentelemetry/api', () => {
  const originalModule = jest.requireActual('@opentelemetry/api');
  return {
    ...originalModule,
    trace: {
      ...originalModule.trace,
      setSpanContext: jest.fn(),
    },
  };
});
jest.mock('@opentelemetry/api-logs', () => {
  const originalModule = jest.requireActual('@opentelemetry/api-logs');
  return {
    ...originalModule,
    Logger: jest.fn().mockImplementation(() => ({
      emit: jest.fn(),
    })),
  };
});

describe('OtelLogger', () => {
  const testTraceContext: TraceContext = {
    traceParent: '00-abcdef1234567890abcdef1234567890-1234567890abcdef-01',
    attributes: {
      Category: 'TestCategory',
      HostInstanceId: 'Host123',
      ProcessId: '6789',
      AdditionalAttribute: 'AdditionalValue',
    },
  };
  const testLogInfo = getPartialFixture<PlatformLogInfo>({
    timestamp: new Date('2024-01-01T00:00:00Z'),
    level: 'info',
    message: 'Test Message',
    loggerName: 'TestLogger',
    metadata: { key: 'value' },
    invocationId: '12345',
  });

  let mockLoggerProvider: MockProxy<LoggerProvider>;
  let mockLogger: MockProxy<Logger>;
  let subject: OtelLogger;

  beforeEach(() => {
    mockLoggerProvider = mock<LoggerProvider>();
    subject = new OtelLogger(mockLoggerProvider);

    mockLogger = mock<Logger>();
    mockLoggerProvider.getLogger.calledWith('default').mockReturnValue(mockLogger);
  });

  it('should log to the underlying LoggerProvider with invocationContext', () => {
    const mockContext = mock<Context>();
    jest.mocked(trace.setSpanContext).mockReturnValue(mockContext);

    subject.log({ ...testLogInfo, traceContext: testTraceContext });

    expect(trace.setSpanContext).toHaveBeenCalledWith(ROOT_CONTEXT, {
      traceId: 'abcdef1234567890abcdef1234567890',
      spanId: '1234567890abcdef',
      traceFlags: 1,
    });
    expect(mockLoggerProvider.getLogger).toHaveBeenCalledWith('default');
    expect(mockLogger.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        timestamp: testLogInfo.timestamp,
        body: 'Test Message',
        severityText: 'info',
        severityNumber: 9,
        context: mockContext,
        attributes: {
          Category: 'TestCategory',
          HostInstanceId: 'Host123',
          ProcessId: '6789',
          AdditionalAttribute: 'AdditionalValue',
          LogLevel: 'info',
          InvocationId: '12345',
          LoggerName: 'TestLogger',
          Metadata: {
            key: 'value',
          },
        },
      }),
    );
  });

  it.each<{ traceParent?: string; message: string }>([
    {
      traceParent: 'invalid-trace-parent',
      message: 'invalid traceParent format',
    },
    {
      traceParent: '00-abcdef1234567890abcdef1234567890-1234567890abcdef', // missing last part
      message: 'missing last part of traceParent',
    },
    {
      traceParent: '00-abcdef1234567890abcdef1234567890-1234567890abcdef-01-extra', // extra part
      message: 'extra part in traceParent',
    },
    {
      traceParent: '00-abcdef1234567890abcdef1234567890-1234567890abcdef-01-invalid', // invalid last part
      message: 'invalid last part in traceParent',
    },
    {
      traceParent: undefined,
      message: 'undefined traceParent',
    },
  ])('should log to the underlying LoggerProvider without invocationContext if $message', ({ traceParent }) => {
    const invalidTraceContext: TraceContext = {
      traceParent,
      attributes: {
        Category: 'TestCategory',
        HostInstanceId: 'Host123',
        ProcessId: '6789',
      },
    };

    subject.log({ ...testLogInfo, traceContext: invalidTraceContext });

    expect(trace.setSpanContext).not.toHaveBeenCalled();
    expect(mockLoggerProvider.getLogger).toHaveBeenCalledWith('default');
    expect(mockLogger.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        timestamp: testLogInfo.timestamp,
        body: 'Test Message',
        severityText: 'info',
        severityNumber: 9,
        attributes: {
          Category: 'TestCategory',
          HostInstanceId: 'Host123',
          ProcessId: '6789',
          LogLevel: 'info',
          InvocationId: '12345',
          LoggerName: 'TestLogger',
          Metadata: {
            key: 'value',
          },
        },
      }),
    );
  });

  it('should log to the underlying LoggerProvider without invocationContext if traceContext is undefined', () => {
    subject.log({ ...testLogInfo });

    expect(mockLoggerProvider.getLogger).toHaveBeenCalledWith('default');
    expect(mockLogger.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        timestamp: testLogInfo.timestamp,
        body: 'Test Message',
        severityText: 'info',
        severityNumber: 9,
        attributes: {
          ProcessId: process.pid,
          LogLevel: 'info',
          InvocationId: '12345',
          LoggerName: 'TestLogger',
          Metadata: {
            key: 'value',
          },
        },
      }),
    );
  });

  it('should log to the underlying LoggerProvider without metadata if metadata is empty', () => {
    subject.log({ ...testLogInfo, metadata: {} });

    expect(mockLoggerProvider.getLogger).toHaveBeenCalledWith('default');
    expect(mockLogger.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        timestamp: testLogInfo.timestamp,
        body: 'Test Message',
        severityText: 'info',
        severityNumber: 9,
        attributes: {
          ProcessId: process.pid,
          LogLevel: 'info',
          InvocationId: '12345',
          LoggerName: 'TestLogger',
        },
      }),
    );
  });
});
