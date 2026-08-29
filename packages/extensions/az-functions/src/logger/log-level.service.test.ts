import { mock, MockProxy } from 'jest-mock-extended';
import { LogLevelService } from './log-level.service';
import { LogLevelProvider } from './logger.model';

describe('LogLevelService', () => {
  let mockLevelProvider: MockProxy<LogLevelProvider>;

  beforeEach(() => {
    mockLevelProvider = mock<LogLevelProvider>();
  });

  it('should return log level for known LoggerName', () => {
    mockLevelProvider.getLogLevel.mockReturnValue('debug');
    const service = new LogLevelService(mockLevelProvider, 'info');

    expect(service.getLogLevel('some-LoggerName')).toBe('debug');
    expect(mockLevelProvider.getLogLevel).toHaveBeenCalledWith('some-LoggerName');
  });

  it('should return default log level when LoggerName is unknown', () => {
    mockLevelProvider.getLogLevel.mockReturnValue(undefined);
    const service = new LogLevelService(mockLevelProvider, 'info');

    expect(service.getLogLevel('unknown-LoggerName')).toBe('info');
    expect(mockLevelProvider.getLogLevel).toHaveBeenCalledWith('unknown-LoggerName');
  });

  it('should return default log level when provider is not available', () => {
    const service = new LogLevelService(undefined, 'warn');

    expect(service.getLogLevel('any-LoggerName')).toBe('warn');
  });
});
