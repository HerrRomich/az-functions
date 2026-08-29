import { InvocationContext } from '@azure/functions';
import { ORIGINAL_INVOCATION_CONTEXT_VALUE_KEY, PLATFORM_CONTEXT_MANAGER, PlatformContextManager } from 'context';
import { inject, injectable, optional } from 'inversify';
import * as Transport from 'winston-transport';
import { LogLevelService } from './log-level.service';
import {
  CONTEXT_LOGGER_METADATA,
  DEFAULT_LOG_LEVEL,
  LOG_LEVELS,
  LOGGER_NAME_META_KEY,
  LogLevel,
  PlatformLogInfo,
} from './logger.model';
import { sanitizeMetadata, SanitizerOptions } from './logger.utils';
import { OtelLogger } from './otel.logger';

function isLogLevel(level: string): level is LogLevel {
  return level in LOG_LEVELS;
}
export type InvocationContextLogger = Pick<InvocationContext, 'log' | 'trace' | 'debug' | 'info' | 'warn' | 'error'>;

export const LOG_METHOD_MAP: Record<LogLevel, keyof InvocationContextLogger> = {
  error: 'error',
  warn: 'warn',
  info: 'info',
  http: 'info',
  verbose: 'info',
  debug: 'debug',
  silly: 'trace',
};

const SANITIZER_OPTIONS: Partial<Record<LogLevel, SanitizerOptions>> = {
  error: {
    maxDepth: Number.MAX_VALUE,
    maxArrayLength: Number.MAX_VALUE,
    maxKeysCount: Number.MAX_VALUE,
    maxStringLength: Number.MAX_VALUE,
  },
  warn: { maxDepth: 10 },
  http: { maxDepth: 5, maxArrayLength: 10 },
  verbose: { maxDepth: 10 },
  debug: { maxDepth: 20, maxArrayLength: 25, maxKeysCount: 25, maxStringLength: 1000 },
  silly: {
    maxDepth: Number.MAX_VALUE,
    maxArrayLength: Number.MAX_VALUE,
    maxKeysCount: Number.MAX_VALUE,
    maxStringLength: Number.MAX_VALUE,
  },
};

interface LogMetadata {
  timestamp: string;
  [LOGGER_NAME_META_KEY]?: string;
  message?: string;
  stack?: string;
  cause?: unknown;
  details?: unknown;
  name?: string;
}

interface LogInfo {
  level: LogLevel;
  message: string;
  metadata: LogMetadata;
}

@injectable()
export class AzFunctionsTransport extends Transport {
  constructor(
    @inject(PLATFORM_CONTEXT_MANAGER)
    private readonly platformContextManager: PlatformContextManager,
    @inject(DEFAULT_LOG_LEVEL)
    private readonly defaultLogLevel: LogLevel,
    @inject(OtelLogger)
    @optional()
    private readonly logger: OtelLogger | undefined,
    private readonly logLevelsService: LogLevelService,
  ) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  log(info: any, next: () => void): any {
    setImmediate(() => {
      this.emit('logged', info);
    });
    const {
      level,
      metadata: { loggerName },
    } = info;
    const currentLogLevel = isLogLevel(level) ? level : this.defaultLogLevel;
    const availableLogLevel = this.logLevelsService.getLogLevel(loggerName);

    if (LOG_LEVELS[currentLogLevel] <= LOG_LEVELS[availableLogLevel]) {
      this.logInternal({
        level: currentLogLevel,
        message: info.message,
        metadata: info.metadata,
      });
    }
    next();
  }

  private logInternal<T extends LogInfo>(info: T): void {
    const platformContext = this.platformContextManager.active();
    const invocationContext = platformContext?.invocationContext;
    const platformLogInfo = this.getPlatformLogInfo(info, invocationContext);
    if (this.logger !== undefined) {
      this.logger.log(platformLogInfo);
    } else {
      const fallbackLogger: InvocationContextLogger =
        platformContext?.getValue<InvocationContext>(ORIGINAL_INVOCATION_CONTEXT_VALUE_KEY) ?? console;
      const logMethod = LOG_METHOD_MAP[info.level];
      if (platformLogInfo.metadata !== undefined) {
        fallbackLogger[logMethod](platformLogInfo.message, platformLogInfo.metadata);
      } else {
        fallbackLogger[logMethod](platformLogInfo.message);
      }
    }
  }

  private getPlatformLogInfo<T extends LogInfo>(logInfo: T, invocationContext?: InvocationContext): PlatformLogInfo {
    const {
      level,
      message,
      metadata: { timestamp, loggerName, ...rest },
    } = logInfo;
    const metadata = this.getContextMetadata(level);
    Object.assign(metadata, rest);
    const extension =
      Object.keys(metadata).length > 0
        ? { metadata: sanitizeMetadata(metadata, SANITIZER_OPTIONS[logInfo.level]) }
        : {};
    return {
      level,
      timestamp: new Date(timestamp),
      message,
      loggerName: loggerName ?? 'unknown',
      invocationId: invocationContext?.invocationId,
      traceContext: invocationContext?.traceContext,
      operationName: invocationContext?.functionName,
      ...extension,
    };
  }

  private getContextMetadata(level: LogLevel): object {
    const contextLoggerMetadata = this.platformContextManager.active()?.getValue(CONTEXT_LOGGER_METADATA);
    let metadata: object = {};
    if (contextLoggerMetadata !== undefined) {
      let distance = Number.MAX_VALUE;
      for (const metaLevel of Object.keys(contextLoggerMetadata)) {
        const typedMetaLevel = metaLevel as LogLevel;
        const newDistance = LOG_LEVELS[level] - LOG_LEVELS[typedMetaLevel];
        if (newDistance >= 0 && newDistance < distance) {
          distance = newDistance;
          metadata = contextLoggerMetadata[typedMetaLevel]!;
        }
      }
    }
    return metadata;
  }
}
