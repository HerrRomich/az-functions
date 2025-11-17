import { TelemetryClient } from 'applicationinsights';
import { mock, MockProxy } from 'jest-mock-extended';
import { ILogger, LogLevel } from './logger.model';
import { PlatformLogger } from './platform.logger';

describe('PlatformLogger', () => {
  const fakeDate = new Date('2024-01-01T00:00:00Z');

  let subject: PlatformLogger;
  let mockTelemetryClient: MockProxy<TelemetryClient>;

  beforeEach(() => {
    jest.useFakeTimers({
      now: fakeDate,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('with TelemetryClient', () => {
    beforeEach(() => {
      mockTelemetryClient = mock();
      subject = new PlatformLogger(mockTelemetryClient);
    });

    it.each<[LogLevel, keyof ILogger, string]>([
      ['info', 'log', 'Information'],
      ['verbose', 'trace', 'Verbose'],
      ['debug', 'debug', 'Verbose'],
      ['info', 'info', 'Information'],
      ['warn', 'warn', 'Warning'],
      ['error', 'error', 'Error'],
    ])('should send trace telemetry on %s', (logLevel, method, severity) => {
      subject[method]({
        message: `Test ${logLevel} message`,
        category: `test.category`,
        stack: `Stack trace`,
      });

      expect(mockTelemetryClient.trackTrace).toHaveBeenCalledWith({
        message: `Test ${logLevel} message`,
        severity,
        time: fakeDate,
        properties: expect.objectContaining({
          Category: `test.category`,
          Stack: `Stack trace`,
          LogLevel: logLevel,
        }),
      });
    });
  });

  describe('without TelemetryClient', () => {
    let storedConsole: typeof global.console;
    let mockConsole: MockProxy<typeof global.console>;

    beforeEach(() => {
      mockConsole = mock();
      storedConsole = global.console;
      global.console = mockConsole;
      subject = new PlatformLogger(undefined);
    });

    afterEach(() => {
      global.console = storedConsole;
    });

    it.each<[LogLevel, keyof ILogger, keyof typeof console]>([
      ['info', 'log', 'info'],
      ['verbose', 'trace', 'trace'],
      ['debug', 'debug', 'debug'],
      ['info', 'info', 'info'],
      ['warn', 'warn', 'warn'],
      ['error', 'error', 'error'],
    ])('should call console.%s on %s', (logLevel, method, consoleMethod) => {
      const testMessage = {
        message: `Test ${logLevel} message`,
        category: `test.category`,
        stack: `Stack trace`,
      };

      subject[method](testMessage);

      expect(mockConsole[consoleMethod]).toHaveBeenCalledWith(testMessage);
    });
  });
});
