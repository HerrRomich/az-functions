import { ROOT_CONTEXT, trace } from '@opentelemetry/api';
import { AnyValueMap, SeverityNumber } from '@opentelemetry/api-logs';
import { LoggerProvider } from '@opentelemetry/sdk-logs';
import { inject, injectable } from 'inversify';
import { LOGGER_PROVIDER, LogLevel, PlatformLogInfo } from './logger.model';

const LOG_LEVEL_SEVERITY_MAP: Record<LogLevel, { severityNumber: SeverityNumber; severityText: string }> = {
  error: {
    severityNumber: SeverityNumber.ERROR,
    severityText: 'error',
  },
  warn: {
    severityNumber: SeverityNumber.WARN,
    severityText: 'warn',
  },
  info: {
    severityNumber: SeverityNumber.INFO,
    severityText: 'info',
  },
  http: {
    severityNumber: SeverityNumber.INFO2,
    severityText: 'http',
  },
  verbose: {
    severityNumber: SeverityNumber.INFO3,
    severityText: 'verbose',
  },
  debug: {
    severityNumber: SeverityNumber.DEBUG,
    severityText: 'debug',
  },
  silly: {
    severityNumber: SeverityNumber.TRACE,
    severityText: 'silly',
  },
};

const TraceParentRegex = /^\d{2}-([0-9a-z]+)-([0-9a-z]+)-\d{2}$/;

@injectable()
export class OtelLogger {
  constructor(@inject(LOGGER_PROVIDER) private readonly loggerProvider: LoggerProvider) {}

  log(logInfo: PlatformLogInfo): void {
    const traceContextValues = this.decodeTraceContext(logInfo);
    let context;
    if (traceContextValues !== undefined) {
      context = trace.setSpanContext(ROOT_CONTEXT, {
        traceId: traceContextValues.operationId,
        spanId: traceContextValues.operationParentId,
        traceFlags: 1,
      });
    }
    const logger = this.loggerProvider.getLogger('default');
    logger.emit({
      timestamp: logInfo.timestamp,
      ...LOG_LEVEL_SEVERITY_MAP[logInfo.level],
      body: logInfo.message,
      context,
      attributes: this.getCustomDimensions(logInfo),
    });
  }

  private decodeTraceContext(logInfo: PlatformLogInfo): { operationId: string; operationParentId: string } | undefined {
    const { traceContext } = logInfo;
    if (traceContext !== undefined) {
      const traceParent = traceContext.traceParent;
      const traceParentParts = traceParent !== undefined ? TraceParentRegex.exec(traceParent) : null;
      if (traceParentParts !== null && traceParentParts.length >= 3) {
        const operationId = traceParentParts[1]!;
        const operationParentId = traceParentParts[2]!;
        return { operationId, operationParentId };
      }
    }
  }

  private getCustomDimensions(logInfo: PlatformLogInfo): AnyValueMap {
    const { level, loggerName, invocationId, traceContext, metadata } = logInfo;
    const severity = LOG_LEVEL_SEVERITY_MAP[level].severityText;
    return {
      LogLevel: severity,
      Category: traceContext?.attributes?.Category,
      HostInstanceId: traceContext?.attributes?.HostInstanceId,
      ProcessId: traceContext?.attributes?.ProcessId ?? process.pid,
      InvocationId: invocationId,
      LoggerName: loggerName,
      ...(metadata !== undefined && Object.getOwnPropertyNames(metadata).length > 0 ? { Metadata: metadata } : {}),
      ...traceContext?.attributes,
    };
  }
}
