import * as appInsights from 'applicationinsights';
import { TelemetryClient } from 'applicationinsights';
import { Container } from 'inversify';
import { DeepMockProxy, mock, mockDeep, MockProxy } from 'jest-mock-extended';
import * as winston from 'winston';
import { AzureLogTransport } from './azure-log-transport.service';
import { LOG_CATEGORY_PROVIDER, LOGGER_FACTORY, loggerModule } from './index';
import { CLOUD_ROLE } from './logger.model';

jest.mock('./azure-log-transport.service');
jest.mock('applicationinsights');
jest.mock('winston');
jest.mock('./platform.logger');
jest.mock('./azure-log-transport.service');

describe('logger', () => {
  let mockLoggerFormat: MockProxy<winston.Logform.Format>;
  let mockLogger: MockProxy<winston.Logger>;
  let mockChildLogger: MockProxy<winston.Logger>;
  let mockTransport: MockProxy<AzureLogTransport>;
  let mockTelemetryClient: DeepMockProxy<TelemetryClient>;

  let subject: Container;

  beforeEach(() => {
    mockLoggerFormat = mock();
    winston.format.splat = jest.fn().mockReturnValue(mockLoggerFormat);

    mockLogger = mock();
    jest.mocked(winston.createLogger).mockReturnValue(mockLogger);
    mockChildLogger = mock();

    mockTransport = mock();
    jest.mocked(AzureLogTransport).mockReturnValue(mockTransport);

    mockTelemetryClient = mockDeep();
    (appInsights.defaultClient as unknown) = mockTelemetryClient;

    subject = new Container();
    subject.loadSync(loggerModule);
  });

  it('should bind AzureLogTransport', () => {
    const transport = subject.get(AzureLogTransport);

    expect(transport).toBe(mockTransport);
  });

  it('should provide logger with category', () => {
    mockLogger.child
      .calledWith(expect.objectContaining({ category: 'test.category' }))
      .mockReturnValue(mockChildLogger);

    const loggerFactory = subject.get(LOGGER_FACTORY);
    const logger = loggerFactory('test.category');

    expect(logger).toBe(mockChildLogger);
    expect(winston.createLogger).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'verbose',
        format: mockLoggerFormat,
        transports: [mockTransport],
      }),
    );
    expect(mockLogger.child).toHaveBeenCalledWith({ category: 'test.category' });
  });

  it('should provide logger without category', () => {
    mockLogger.child.mockReturnValue(mockChildLogger);

    const loggerFactory = subject.get(LOGGER_FACTORY);
    const logger = loggerFactory();

    expect(logger).toBe(mockChildLogger);
    expect(winston.createLogger).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'verbose',
        format: mockLoggerFormat,
        transports: [mockTransport],
      }),
    );
    expect(mockLogger.child).toHaveBeenCalledWith({});
  });

  it('should provide logger with provided category from LOG_CATEGORY_PROVIDER', () => {
    subject.bind(LOG_CATEGORY_PROVIDER).toConstantValue(() => 'provided.category');

    mockLogger.child
      .calledWith(expect.objectContaining({ category: 'provided.category' }))
      .mockReturnValue(mockChildLogger);

    const loggerFactory = subject.get(LOGGER_FACTORY);
    const logger = loggerFactory();

    expect(logger).toBe(mockChildLogger);
    expect(winston.createLogger).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'verbose',
        format: mockLoggerFormat,
        transports: [mockTransport],
      }),
    );
    expect(mockLogger.child).toHaveBeenCalledWith({ category: 'provided.category' });
  });

  it('should not bind TelemetryClient when WEBSITE_INSTANCE_ID is not set', () => {
    const telemetryClient = subject.get(appInsights.TelemetryClient, { optional: true });

    expect(telemetryClient).toBeUndefined();
    expect(appInsights.setup).not.toHaveBeenCalled();
    expect(appInsights.start).not.toHaveBeenCalled();
  });

  it('should bind TelemetryClient when WEBSITE_INSTANCE_ID is set', () => {
    subject.unloadSync(loggerModule);
    process.env.WEBSITE_INSTANCE_ID = 'test-instance';
    subject.loadSync(loggerModule);

    const telemetryClient = subject.get(appInsights.TelemetryClient);

    expect(telemetryClient).toBe(appInsights.defaultClient);
    expect(mockTelemetryClient.context.tags[appInsights.defaultClient.context.keys.cloudRole]).toEqual(CLOUD_ROLE);
    expect(appInsights.setup).toHaveBeenCalled();
    expect(appInsights.start).toHaveBeenCalled();

    delete process.env.WEBSITE_INSTANCE_ID;
  });
});
