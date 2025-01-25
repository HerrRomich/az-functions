import { InvocationContext } from '@azure/functions';
import { injectable } from 'inversify';
import { PlatformContextLocalStorage } from '../shared/platform-context-local-storage';

type ILogger = Pick<InvocationContext, 'log' | 'trace' | 'debug' | 'info' | 'warn' | 'error'>;

@injectable()
export class Logger implements ILogger {
  constructor(private readonly contextStorage: PlatformContextLocalStorage) {}

  private getLogger(): ILogger {
    return this.contextStorage.getStore()?.invocationContext ?? console;
  }

  log(...args: unknown[]) {
    this.getLogger().log(...args);
  }

  trace(...args: unknown[]) {
    this.getLogger().trace(...args);
  }

  debug(...args: unknown[]) {
    this.getLogger().debug(...args);
  }

  info(...args: unknown[]) {
    this.getLogger().info(...args);
  }

  warn(...args: unknown[]) {
    this.getLogger().warn(...args);
  }

  error(...args: unknown[]) {
    this.getLogger().error(...args);
  }
}
