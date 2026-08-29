import { AzureMonitorLogExporter } from '@azure/monitor-opentelemetry-exporter';
import { Resource, resourceFromAttributes } from '@opentelemetry/resources';
import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs';
import { ATTR_SERVICE_INSTANCE_ID, ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { getPartialFixture } from '@utilities/test-utilities';
import { ResolutionContext } from 'inversify';
import { fn, Mock, mocked } from 'jest-mock';
import { mock, MockProxy } from 'jest-mock-extended';
import * as winston from 'winston';
import { bindLoggerFactory, bindOtelLoggerProvider, bindWinstonLogger } from './bindings';
import { AzFunctionsTransport } from './log-transport.service';
import { LOG_LEVELS, LOGGER_NAME_PROVIDER, LoggerNameProvider } from './logger.model';

jest.mock('./log-transport.service');
jest.mock('winston', () => {
  const actual = jest.requireActual('winston');
  return {
    ...actual,
    createLogger: jest.fn(),
    format: {
      combine: jest.fn(),
      timestamp: jest.fn(),
      splat: jest.fn(),
      metadata: jest.fn(),
    },
  };
});
jest.mock('@opentelemetry/sdk-logs');
jest.mock('@opentelemetry/resources');
jest.mock('@azure/monitor-opentelemetry-exporter');

describe('logger bindings', () => {
  let mockContext: MockProxy<ResolutionContext>;

  beforeEach(() => {
    mockContext = mock<ResolutionContext>();
  });

  describe('bindWinstonLogger', () => {
    it('should create a winston logger with the provided transport', () => {
      const mockTransport = mock<AzFunctionsTransport>();
      const mockLogger = mock<winston.Logger>();
      mockLogger.child.mockReturnValue(mockLogger);

      mockContext.get.calledWith(winston.Logger).mockReturnValue(mockLogger);
      mockContext.get.calledWith(AzFunctionsTransport).mockReturnValue(mockTransport);

      const mockLoggerCreator = mocked(winston.createLogger).mockImplementation(() => mockLogger);
      const mockCombinedFormat = mock<winston.Logform.Format>();
      const mockFormatter = mocked(winston.format.combine).mockImplementation(() => mockCombinedFormat);
      const mockSplatFormat = mock<winston.Logform.Format>();
      mocked(winston.format.splat).mockImplementation(() => mockSplatFormat);
      const mockTimestampFormat = mock<winston.Logform.Format>();
      mocked(winston.format.timestamp).mockImplementation(() => mockTimestampFormat);
      const mockMetadataFormat = mock<winston.Logform.Format>();
      mocked(winston.format.metadata).mockImplementation(() => mockMetadataFormat);

      const logger = bindWinstonLogger(mockContext);

      expect(logger).toBe(mockLogger);
      expect(mockLoggerCreator).toHaveBeenCalledWith({
        level: 'silly',
        levels: LOG_LEVELS,
        format: mockCombinedFormat,
        transports: [mockTransport],
      });
      expect(mockFormatter).toHaveBeenCalledWith(mockTimestampFormat, mockSplatFormat, mockMetadataFormat);
    });
  });

  describe('bindLoggerFactory', () => {
    let mockLogger: MockProxy<winston.Logger>;
    let mockExpectedLogger: MockProxy<winston.Logger>;
    let nameProvider: Mock<LoggerNameProvider>;
    let mockContext: MockProxy<ResolutionContext>;

    beforeEach(() => {
      mockLogger = mock<winston.Logger>();
      nameProvider = fn<LoggerNameProvider>().mockReturnValue('testLogger');

      mockContext = mock<ResolutionContext>();
      mockContext.get.calledWith(winston.Logger).mockReturnValue(mockLogger);
      mockContext.get
        .calledWith(LOGGER_NAME_PROVIDER, expect.objectContaining({ optional: true }))
        .mockReturnValue(nameProvider);

      mockExpectedLogger = mock<winston.Logger>();
      mockLogger.child.mockReturnValue(mockExpectedLogger);
    });

    it('should provide a logger factory with name provider', () => {
      const loggerFactory = bindLoggerFactory(mockContext);

      const actualLogger = loggerFactory();

      expect(actualLogger).toBe(mockExpectedLogger);
      expect(nameProvider).toHaveBeenCalled();
      expect(mockLogger.child).toHaveBeenCalledWith({ loggerName: 'testLogger' });
    });

    it('should provide a logger factory with name provider but using custom logger name', () => {
      const loggerFactory = bindLoggerFactory(mockContext);

      const actualLogger = loggerFactory('customLogger');

      expect(actualLogger).toBe(mockExpectedLogger);
      expect(nameProvider).not.toHaveBeenCalled();
      expect(mockLogger.child).toHaveBeenCalledWith({ loggerName: 'customLogger' });
    });

    it('should provide a logger factory without name provider', () => {
      mockContext.get
        .calledWith(LOGGER_NAME_PROVIDER, expect.objectContaining({ optional: true }))
        .mockReturnValue(undefined);
      const loggerFactory = bindLoggerFactory(mockContext);

      const actualLogger = loggerFactory();

      expect(actualLogger).toBe(mockExpectedLogger);
      expect(nameProvider).not.toHaveBeenCalled();
      expect(mockLogger.child).toHaveBeenCalledWith({ loggerName: '' });
    });
  });

  describe('bindOtelLoggerProvider', () => {
    it('should bind logger provider with the provided configuration', () => {
      const mockLoggerProvider = mock<LoggerProvider>();
      const mockProviderCreator = mocked(LoggerProvider).mockReturnValue(mockLoggerProvider);
      const mockResource = getPartialFixture<Resource>();
      const mockResourceCreator = mocked(resourceFromAttributes).mockReturnValue(mockResource);
      const mockBatchProcessor = mock<BatchLogRecordProcessor>();
      const mockProcessorCreator = mocked(BatchLogRecordProcessor).mockReturnValue(mockBatchProcessor);
      const mockExporter = mock<AzureMonitorLogExporter>();
      const mockExporterCreator = mocked(AzureMonitorLogExporter).mockReturnValue(mockExporter);

      const testOtelConfiguration = {
        applicationInsightsConnectionString: 'test-connection-string',
        serviceName: 'test-service',
        serviceInstanceId: 'test-instance-id',
        serviceVersion: '1.0.0',
      };

      const loggerProvider = bindOtelLoggerProvider(testOtelConfiguration);

      expect(loggerProvider).toBe(mockLoggerProvider);
      expect(mockProviderCreator).toHaveBeenCalledWith({ resource: mockResource, processors: [mockBatchProcessor] });
      expect(mockResourceCreator).toHaveBeenCalledWith({
        [ATTR_SERVICE_NAME]: testOtelConfiguration.serviceName,
        [ATTR_SERVICE_INSTANCE_ID]: testOtelConfiguration.serviceInstanceId,
        [ATTR_SERVICE_VERSION]: testOtelConfiguration.serviceVersion,
      });
      expect(mockProcessorCreator).toHaveBeenCalledWith(mockExporter);
      expect(mockExporterCreator).toHaveBeenCalledWith({
        connectionString: testOtelConfiguration.applicationInsightsConnectionString,
      });
    });
  });
});
