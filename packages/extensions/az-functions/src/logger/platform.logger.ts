import { KnownSeverityLevel, TelemetryClient } from 'applicationinsights';
import { inject, injectable, optional } from 'inversify';
import { CombinedMessage, ILogger, LogLevel } from './logger.model';

const SEVERITY_LEVEL_MAP: Record<LogLevel, string> = {
  verbose: KnownSeverityLevel.Verbose,
  debug: KnownSeverityLevel.Verbose,
  info: KnownSeverityLevel.Information,
  warn: KnownSeverityLevel.Warning,
  error: KnownSeverityLevel.Error,
};

const CONSOLE_METHOD_MAP: Record<LogLevel, keyof ILogger> = {
  verbose: 'trace',
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
};

@injectable()
export class PlatformLogger implements ILogger {
  constructor(@inject(TelemetryClient) @optional() private readonly telemetryClient: TelemetryClient | undefined) {}

  error(...args: unknown[]): void {
    this.logInternal('error', ...args);
  }

  warn(...args: unknown[]): void {
    this.logInternal('warn', ...args);
  }

  info(...args: unknown[]): void {
    this.logInternal('info', ...args);
  }

  debug(...args: unknown[]): void {
    this.logInternal('debug', ...args);
  }

  log(...args: unknown[]): void {
    this.logInternal('info', ...args);
  }

  trace(...args: unknown[]): void {
    this.logInternal('verbose', ...args);
  }

  private logInternal(level: LogLevel, ...args: unknown[]): void {
    if (this.telemetryClient !== undefined) {
      this.createTraceTelemetry(this.telemetryClient, level, args[0] as CombinedMessage);
    } else {
      const method = CONSOLE_METHOD_MAP[level];
      console[method](...args);
    }
  }

  private createTraceTelemetry(
    telemetryClient: TelemetryClient,
    level: LogLevel,
    combinedMessage: CombinedMessage,
  ): void {
    const { category, message, stack } = combinedMessage;
    const severity = SEVERITY_LEVEL_MAP[level];
    telemetryClient.trackTrace({
      message,
      time: new Date(),
      severity,
      properties: {
        Category: category,
        ProcessId: process.pid,
        LogLevel: level,
        Stack: stack,
      },
    });
  }
}
