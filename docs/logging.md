# Logging

## Principals
To have successful logging in an Azure Functions application, the following principals must be in place:

### Flexibility of logging levels
The logging system should allow different thresholds for different loggers, enabling developers to control the verbosity of logs based on their needs.

#### Granular control
Developers should have the ability to get / inject a logger with a specific logger name, that represents the scope of the functionality or component that uses this dedicated logger.

#### Dynamic log level configuration
The logging system should support dynamic configuration of log levels, allowing developers to change the logging level at runtime without restarting the application.
This is particularly useful for troubleshooting and debugging in production environments.

#### Predictable fallback
If a logger name has no explicitly configured log level, the logging system uses the global default log level as a fallback.

#### Hierarchical naming support
Names like `#backend.interfaces.rest.console.trucks.TrucksController`can inherit from `#backend.interfaces.rest.console` or `#backend.interfaces.rest` or `#backend.interfaces` or `#backend.interfaces.rest` unless overridden by a more specific configuration.

### Structured logging
The logging system should support structured logging. 
Using modern telemetry systems, structured logging allows logs to be more easily searchable and analyzable.

#### String interpolation
String interpolation functionality can be mimicked by using string templates.
However, it should be supported for backward compatibility with Azure Functions invocation invocationContext logger.

#### Using JSON rawMetadata
The logging system should allow developers to include structured rawMetadata in their log entries in JSON format, enabling better integration with log analysis tools and improving the ability to filter and search logs based on specific attributes.

#### Better error logging
The logging system should provide enhanced support for logging exceptions and errors, allowing developers to capture and store detailed information about the error, such as stack traces, error codes, and contextual information, in a structured format.

### Integration / overloading of existing logging frameworks

#### Smooth transition
The logging system should allow developers to easily transition from existing logging framework (InvocationContext.Logger) to the new logging system without requiring significant code changes, ensuring a smooth migration process.

#### Integration with Application Insights
The logging system should seamlessly integrate with Azure Application Insights, making switch to the new logging system transparent and not disruptive to existing monitoring and telemetry setups.

## Guidelines

We should rely on the flexibility of logging levels and log as much data as possible.
This means that we can log simultaneously with different log levels in the same code:
```typescript
  logger.info('fetching items');
  logger.verbose(`fetching items for customer customerId=${customerId}`, { customerId });
  
  const responseData: Item[] = await getItems(customerId);
  
  logger.info('fetched items successfully');
  logger.verbose(`fetched items for customer customerId=${customerId} itemCount=${responseData.length}`, { customerId, itemsCount: responseData.length });
  logger.debug(`fetched items for customer customerId=${customerId}`, { customerId, responseData });
```
### Logger name
Logger name in combination with log level configuration allows to control the verbosity of logs based on the needs, without changing the code.
For example, we can have a logger with name `#backend.interfaces.rest.console.trucks.TrucksController` with log level `debug`, and another logger with name `#backend.interfaces.rest.console.cars.CarsController` with log level `error`, and they will log with different verbosity without affecting each other.

### Logging levels
There are many different, standardized logging levels in Node.js ecosystem.
Following levels mostly cover the needs of Azure Functions applications, and are supported by winston logging framework:

- **silly** - the most verbose log level, used for detailed debugging information that may be useful during development or troubleshooting.
This logging level can be activated temporarily only for narrowly scoped functionality during the analysis of specific issues.
- **debug** - used for general debugging information, less detailed than `silly`.
This logging level can be used for general debugging purposes, and can be enabled in development and staging environments.
- **verbose** - used for verbose logging, providing more invocationContext than `info`. 
- Can be permanently enabled for specific loggers in production environments to provide more insights into the application behavior without overwhelming the logs with too much data.
- **http** - used for HTTP request/result logging.
Useful for tracking incoming requests and outgoing responses, and can be enabled in production environments to monitor the application's interactions with clients and other services.
- **info** - used for informational messages that highlight the progress of the application.
It's up to the developers to decide in which cases to use `info` but should be used with caution not to overwhelm the logs with too much data.
As a rule of thumb, this is a recommended default log level for production environments, as it provides a good balance between verbosity and usefulness of logs for monitoring and troubleshooting.
- **warn** - used for potentially harmful situations.
Typical use cases include catching functional, not technical, errors, such as validation errors, or failed external service calls.
- **error** - used for error events that might still allow the application to continue running.
Typical use cases include catching technical errors.

### Message format
The message is not the main payload — it is the human‑readable summary of the event.

A good message follows this pattern:

 > \<verb\> \<domain object\> \<status\> [key=value key=value ...]

Examples:

 * "created user successfully id=123 email=john@example.com"
 * "executed SQL query duration=42ms rows=12"
 * "validated request body errors=3"
 * "failed to send email reason=timeout"

The message should be:
 * human‑readable sentence fragment
 * lower-cased to be visually uniform

Key-value pairs are optional, and should follow the rules:
 * follow the message
 * space-separated
 * keys should be camelCased
 * values should be simple data types (string, number, boolean), no JSON.
 * if value contains spaces, it should be enclosed in quotes, e.g. `reason="validation failed"`

### Metadata
Depending on the log level and the invocationContext, it is often useful to include additional rawMetadata in log entries.
It can be done by passing an object as a parameter to logging methods, following the message parameter.
```typescript
  logger.debug(`fetched items for customer customerId=${customerId}`, { customerId, responseData });
```
> Note: The rawMetadata can be passed in multiple parameters. The all should be merged into a single object, and the last parameter should take precedence in case of key conflicts.

### Errors
It should be possible to use error as the parameter of logging methods.
For better logging of errors, it is recommended to introduce a custom base error class that extends the native Error class, and includes additional properties.
```typescript
export interface AzFunctionsErrorOptions extends ErrorOptions {
  details?: Record<string, unknown>;
}

export class AzFunctionsError extends Error {
  readonly details?: Record<string, unknown>;

  constructor(message?: string, options?: AzFunctionsErrorOptions) {
    super(message, options);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
    this.details = options?.details;
  }
}
```
 > **Note**: Logging of the error should happen only if it is handled and not re-thrown, otherwise it can lead to duplicate logging of the same error in case of multiple catch blocks.

## Choice of logging framework ([winston](https://github.com/winstonjs/winston))
During the analysis of logging frameworks, we have considered several options, including [winston](https://github.com/winstonjs/winston).
Following main reasoning were considered for choosing winston as the logging framework for Azure Functions:
- **Customizable transports**: Winston allows for the creation of custom transports, enabling log level based routing and filtering and also integration with Azure Application Insights.
- **Structured logging support**: Winston natively supports structured logging, allowing developers to include rawMetadata in their log entries.
- **Top community support**: Winston is a widely used logging library in the Node.js ecosystem, with a large community and active development, ensuring ongoing support and improvements.

## Integration of [winston](https://github.com/winstonjs/winston)
The primary assumption for the integration of winston is the usage of IoC container [inversifyJS](https://github.com/inversify/InversifyJS).

It is necessary to have an invocation invocationContext of the Azure Function trigger in the invocationContext of logger calls, to be able to correlate logs with the specific function invocation.

### Available log levels
The logging system supports the following log levels, in order of increasing severity:
- **silly** - the most verbose log level, used for detailed debugging information that may be useful during development or troubleshooting.
- **debug** - used for general debugging information, less detailed than `silly`.
- **verbose** - used for verbose logging, providing more invocationContext than `info`.
- **http** - used for HTTP request/result logging.
- **info** - used for informational messages that highlight the progress of the application.
- **warn** - used for potentially harmful situations.
- **error** - used for error events that might still allow the application to continue running.

```typescript
export const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
} as const;

export type LogLevel = keyof typeof LOG_LEVELS;
export const DEFAULT_ROOT_LOG_LEVEL: LogLevel = 'info';
export const DEFAULT_LOG_LEVEL = serviceIdentifier<LogLevel>('LOG_LEVEL');
```

### Logger
A logger is a fork of the winston logger, which provides the same logging methods (`error`, `warn`, `info`, `http`, `verbose`, `debug`, `silly`) and supports structured logging with JSON rawMetadata.
Log entries are enriched with a timestamp and rawMetadata about the function invocation (like invocation id, function name, etc.) to provide better invocationContext for log analysis and troubleshooting.
String interpolation can be omitted in favout of string templates.

```typescript
export type Logger = Pick<winston.Logger, LogLevel>;
```
```typescript
  container.bind(winston.Logger).toDynamicValue(invocationContext => {
    const transport = invocationContext.get(AzFunctionsTransport);
    return winston.createLogger({
      level: 'verbose',
      levels: LOG_LEVELS,
      format: winston.format.combine(winston.format.timestamp(), winston.format.splat(), winston.format.rawMetadata()),
      transports: [transport],
    });
  });
```
 * Each log entry wil be formatted:
   * To include timestamp
   * to translate message by the string interpolation. (It is needed for backward compatibility)
   * To include structured rawMetadata in JSON format. 
 * Custom transport will implement logic to filter log entries based on their log level and threshold resolved by the logger name, and route them to Azure Application Insights.

### Logger factory
A logger factory provides an instance of a logger with the preconfigured logger name. 
It has a single parameter - logger name, which is a string that represents the scope of the functionality or component that uses this dedicated logger.
If logger name is omitted, the logger factory will request the name from the `LOGGER_NAME_PROVIDER` (which is a function that returns the logger name). 
If it is not provided, it will use the global default logger name `ROOT_LOGGER_NAME` as a fallback.
```typescript
export const LOGGER_FACTORY = serviceIdentifier<LoggerFactory>('Logger factory.');
export type LoggerFactory = (loggerName?: string) => Logger;

export const ROOT_LOGGER_NAME = 'root';

export type LoggerNameProvider = (stackEntry?: string) => string | undefined;
export const LOGGER_NAME_PROVIDER = serviceIdentifier<LoggerNameProvider>('LOGGER_NAME_PROVIDER');
```

 > **Note**: The logger name can be set / overridden in each call to logger by setting rawMetadata property `loggerName` in the log entry.

### Platform invocationContext manager
The original invocation invocationContext of the Azure Function trigger should be preserved in the call invocationContext of the implementation.
This is necessary to be able to correlate log entries with the specific function invocation, and also to provide the fallback logger that uses the original invocation invocationContext logger if the OpenTelemetry was not properly configured.

This is done by introducing a platform invocationContext manager that allows to run the trigger handler in a customized invocationContext.

```typescript
export class PlatformContextError extends AzFunctionsRuntimeError {}

export const PLATFORM_CONTEXT_MANAGER = serviceIdentifier<PlatformContextManager>('Platform InvocationCtx manager');

export interface PlatformContextManager {
  active(): PlatformContext | undefined;
  runWith<T>(platformContext: PlatformContext, callback: () => T): T;
}

@injectable()
export class BasePlatformContextManager implements PlatformContextManager {
  private readonly storage = new AsyncLocalStorage<PlatformContext>();

  runWith<T>(platformContext: PlatformContext, callback: () => T): T {
    if (this.active() !== undefined) {
      throw new PlatformContextError(
        'A platform InvocationCtx is already active. Nested platform contexts are not supported.',
      );
    }
    return this.storage.run(platformContext, callback);
  }

  active(): PlatformContext | undefined {
    return this.storage.getStore();
  }
}
```

### Platform invocationContext provider
```typescript
export const PLATFORM_CONTEXT_PROVIDER = serviceIdentifier<PlatformContextProvider>('Platform InvocationCtx provider');
export interface PlatformContextProvider {
  providePlatformContext(invocationContext: InvocationContext): PlatformContext;
}

export const ORIGINAL_INVOCATION_CONTEXT_VALUE_KEY =
  createPlatformContextValueKey<InvocationContext>('Original invocation InvocationCtx');

export class PlatformExecutionContext implements PlatformContext {
  private readonly data: Map<PlatformContextValueKey, unknown>;
  readonly invocationContext: InvocationContext;

  constructor(invocationContext: InvocationContext, logger: winston.Logger) {
    this.invocationContext = new WrappedInvocationContext(invocationContext, logger.child({}));
    this.data = new Map<PlatformContextValueKey, unknown>();
    this.data.set(ORIGINAL_INVOCATION_CONTEXT_VALUE_KEY, invocationContext);
  }

  getValue<T>(key: PlatformContextValueKey<T>): T | undefined {
    return this.data.get(key) as T | undefined;
  }

  setValue<T>(key: PlatformContextValueKey<T>, value: T): PlatformContext {
    this.data.set(key, value);
    return this;
  }

  deleteValue(key: PlatformContextValueKey): PlatformContext {
    this.data.delete(key);
    return this;
  }
}

@injectable()
export class PlatformExecutionContextProvider implements PlatformContextProvider {
  constructor(private readonly logger: winston.Logger) {}

  providePlatformContext(invocationContext: InvocationContext): PlatformContext {
    return new PlatformExecutionContext(invocationContext, this.logger);
  }
}
```

### Invocation invocationContext wrapper
The original invocation invocationContext of the Azure Function trigger should be wrapped in a customized invocationContext that allows proxying the logging calls to the underlying winston logger, while preserving the original invocationContext information.
This invocationContext should be used in the execution

#### Programming model v3
```typescript
class WrappedInvocationContext implements InvocationCtx {
  log: Logger;

  constructor(
    private invocationContext: InvocationCtx,
    logger: winston.Logger,
  ) {
    this.log = Object.assign((message: any, ...args: any[]) => logger.info(message, ...args), {
      error: (message: any, ...args: any[]) => logger.error(message, ...args),
      warn: (message: any, ...args: any[]) => logger.warn(message, ...args),
      info: (message: any, ...args: any[]) => logger.info(message, ...args),
      verbose: (message: any, ...args: any[]) => logger.verbose(message, ...args),
    });
  }

  get bindingData(): ContextBindingData {
    return this.invocationContext.bindingData;
  }
  set bindingData(value: ContextBindingData) {
    this.invocationContext.bindingData = value;
  }

  get bindingDefinitions(): BindingDefinition[] {
    return this.invocationContext.bindingDefinitions;
  }
  set bindingDefinitions(value: BindingDefinition[]) {
    this.invocationContext.bindingDefinitions = value;
  }
  get bindings(): ContextBindings {
    return this.invocationContext.bindings;
  }
  set bindings(value: ContextBindings) {
    this.invocationContext.bindings = value;
  }
  get executionContext(): ExecutionContext {
    return this.invocationContext.executionContext;
  }
  set executionContext(value: ExecutionContext) {
    this.invocationContext.executionContext = value;
  }
  get invocationId(): string {
    return this.invocationContext.invocationId;
  }
  set invocationId(value: string) {
    this.invocationContext.invocationId = value;
  }
  get req(): HttpRequest | undefined {
    return this.invocationContext.req;
  }
  set req(value: HttpRequest) {
    this.invocationContext.req = value;
  }
  get res(): { [p: string]: any } | undefined {
    return this.invocationContext.res;
  }
  set res(value: { [p: string]: any }) {
    this.invocationContext.res = value;
  }
  get suppressAsyncDoneError(): boolean | undefined {
    return this.invocationContext.suppressAsyncDoneError;
  }
  set suppressAsyncDoneError(value: boolean) {
    this.invocationContext.suppressAsyncDoneError = value;
  }
  get traceContext(): TraceContext {
    return this.invocationContext.traceContext;
  }
  set traceContext(value: TraceContext) {
    this.invocationContext.traceContext = value;
  }

  done(err?: Error | string | null, result?: any): void {
    this.done(err, result);
  }
}

```

##### Programming model v4
```typescript
const LOG_LEVEL_MAP: Record<FunctionsLoglevel, LogLevel> = {
  critical: 'error',
  error: 'error',
  warning: 'warn',
  information: 'info',
  debug: 'debug',
  trace: 'verbose',
  none: 'info',
};

export class WrappedInvocationContext extends InvocationContext {
  constructor(parentInvocationContext: InvocationContext, logger: winston.Logger) {
    super({
      ...parentInvocationContext,
      logHandler: (level, ...args) => {
        const translatedLogLevel = LOG_LEVEL_MAP[level];
        const [message, ...meta] = args;
        logger.log(translatedLogLevel, message as string, ...meta);
      },
    });
  }
}
```

### Logger Transport

The custom transport will implement following logic:
 * Filters log entries based on their log level and threshold resolved by the logger name.
 * Combines the rawMetadata.
 * Adjusts rawMetadata with error chain structure if error is present in the log entry.
 * Routes log entries to Azure Application Insights using the underlying invocation invocationContext of the Azure Function trigger.

```typescript
function isLogLevel(level: string): level is LogLevel {
  return level in LOG_LEVELS;
}
function logLevelOrDefault(level: string): LogLevel {
  return isLogLevel(level) ? level : DEFAULT_ROOT_LOG_LEVEL;
}

export type InvocationContextLogger = Pick<InvocationContext, 'log' | 'trace' | 'debug' | 'info' | 'warn' | 'error'>;

export const LOG_METHOD_MAP: Record<LogLevel, keyof InvocationContextLogger | undefined> = {
  error: 'error',
  warn: 'warn',
  info: 'info',
  http: 'info',
  verbose: 'info',
  debug: 'debug',
  silly: 'trace',
};

interface LogMetadata {
  loggerName?: string;
  stack?: string;
  cause?: unknown;
  details?: unknown;
  name?: string;
}

interface LogInfo {
  level: LogLevel;
  message: string;
  timestamp: string;
  rawMetadata: LogMetadata;
}

@injectable()
export class AzFunctionsTransport extends Transport {
  constructor(
    @inject(PLATFORM_CONTEXT_MANAGER)
    private readonly platformContextManager: PlatformContextManager,
    @inject(OtelLogger)
    @optional()
    private readonly logger: OtelLogger | undefined,
    private readonly logLevelsService: LogLevelService,
  ) {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  log(info: LogInfo, next: () => void): any {
    setImmediate(() => {
      this.emit('logged', info);
    });
    const {
      level,
      rawMetadata: { loggerName },
    } = info;
    const currentLogLevel = logLevelOrDefault(level);
    const availableLogLevel = this.logLevelsService.getLogLevel(loggerName);

    if (LOG_LEVELS[currentLogLevel] <= LOG_LEVELS[availableLogLevel]) {
      this.logInternal(info);
    }
    if (next) {
      next();
    }
  }

  private logInternal(info: LogInfo): void {
    const platformContext = this.platformContextManager.active();
    const invocationContext = platformContext?.invocationContext;
    const platformLogInfo = this.getPlatformLogInfo(info, invocationContext);
    if (this.logger !== undefined) {
      this.logger.log(platformLogInfo);
    } else {
      const originalInvocationContext = platformContext?.getValue<InvocationContext>(
        ORIGINAL_INVOCATION_CONTEXT_VALUE_KEY,
      );
      const logMethod = LOG_METHOD_MAP[info.level] ?? 'log';
      originalInvocationContext?.[logMethod](platformLogInfo.message, platformLogInfo.rawMetadata);
    }
  }

  private getPlatformLogInfo(logInfo: LogInfo, invocationContext?: InvocationContext): PlatformLogInfo {
    const {
      timestamp,
      message,
      rawMetadata: { loggerName, stack, cause, details, ...rest },
    } = logInfo;
    const rawMetadata: Metadata = {
      loggerName: loggerName ?? ROOT_LOGGER_NAME,
    };
    if (stack !== undefined) {
      const errorChain: ErrorChain = {
        name: rest.name ?? 'Error',
        message,
        stack,
      };
      if (details !== undefined) {
        Object.assign(errorChain, { details });
      }
      this.provideErrorChain(errorChain, cause);
      rawMetadata.errorChain = errorChain;
    }
    if (loggerName) {
      rawMetadata.loggerName = loggerName;
    }
    Object.assign(rawMetadata, rest);
    return {
      level: logInfo.level,
      timestamp: new Date(timestamp),
      message,
      invocationId: invocationContext?.invocationId,
      traceContext: invocationContext?.traceContext,
      operationName: invocationContext?.functionName,
      rawMetadata,
    };
  }

  private provideErrorChain(errorChain: ErrorChain, error: unknown) {
    if (error === undefined) {
      return;
    }
    const innerError: ErrorChain = {
      name: 'UnknownError',
      message: String(error),
    };
    errorChain.innerError = innerError;
    if (error instanceof Error) {
      innerError.name = error.name;
      innerError.message = error.message;
      if (error.stack) {
        innerError.stack = error.stack;
      }
      this.provideErrorChain(innerError, error.cause);
    }
    if (error instanceof AzFunctionsError && error.details) {
      Object.assign(innerError, { details: error.details });
    }
  }
}
```

## Integration of Open Telemetry
### Open Telemetry logger (OtelLogger)
Otel logger is an optional dependency that can be used to log telemetry data to Azure Application Insights using OpenTelemetry.

```typescript
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
export class OtelLogger implements PlatformLogger {
  constructor(@inject(LOGGER_PROVIDER) private readonly loggerProvider: LoggerProvider) {}

  log(logInfo: PlatformLogInfo): void {
    const traceContextValues = this.decodeTraceContext(logInfo);
    let invocationContext;
    if (traceContextValues !== undefined) {
      invocationContext = trace.setSpanContext(ROOT_CONTEXT, {
        traceId: traceContextValues.triggerId,
        spanId: traceContextValues.operationParentId,
        traceFlags: 1,
      });
    }
    const logger = this.loggerProvider.getLogger('default');
    logger.emit({
      timestamp: logInfo.timestamp,
      ...LOG_LEVEL_SEVERITY_MAP[logInfo.level],
      body: logInfo.message,
      invocationContext,
      attributes: this.getCustomDimensions(logInfo),
    });
  }

  private decodeTraceContext(logInfo: PlatformLogInfo): { triggerId: string; operationParentId: string } | undefined {
    const { traceContext } = logInfo;
    if (traceContext !== undefined) {
      const traceParent = traceContext.traceParent;
      const traceParentParts = traceParent !== undefined ? TraceParentRegex.exec(traceParent) : null;
      if (traceParentParts !== null && traceParentParts.length >= 3) {
        const triggerId = traceParentParts[1]!;
        const operationParentId = traceParentParts[2]!;
        return { triggerId, operationParentId };
      }
    }
  }

  private getCustomDimensions(logInfo: PlatformLogInfo): AnyValueMap {
    const { level, invocationId, traceContext, rawMetadata } = logInfo;
    const severity = LOG_LEVEL_SEVERITY_MAP[level].severityText;
    return {
      LogLevel: severity,
      Category: traceContext?.attributes?.Category,
      HostInstanceId: traceContext?.attributes?.HostInstanceId,
      ProcessId: traceContext?.attributes?.ProcessId ?? process.pid,
      InvocationId: invocationId,
      Metadata: {
        ...rawMetadata,
      },
      ...traceContext?.attributes,
    };
  }
}
```

### Logger provider
The logger provider is a wrapper around the OpenTelemetry logger provider that allows to get a logger instance.

```typescript
import { AzureMonitorLogExporter } from '@azure/monitor-opentelemetry-exporter';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs';
import { ATTR_SERVICE_INSTANCE_ID, ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
  
....

  container.bind(LOGGER_PROVIDER).toDynamicValue(() => {
    const connectionString = otelConfiguration?.applicationInsightsConnectionString;
    return new LoggerProvider({
      resource: resourceFromAttributes({
        [ATTR_SERVICE_NAME]: otelConfiguration?.serviceName,
        [ATTR_SERVICE_INSTANCE_ID]: otelConfiguration?.serviceInstanceId,
        [ATTR_SERVICE_VERSION]: otelConfiguration?.serviceVersion,
      }),
      processors: [new BatchLogRecordProcessor(new AzureMonitorLogExporter({ connectionString }))],
    });
  });
```

## Usage
The trigger handler call should be wrapped in a customized invocationContext:

#### Programming model v3
```typescript
export const HTTP_REQUEST_CONTEXT_VALUE_KEY =
  createPlatformContextValueKey<InvocationCtx>('Original HTTP request');

async function innerHttpTrigger(invocationContext: InvocationCtx, req: HttpRequest): Promise<void> {
  const logger = container.get(LOGGER_FACTORY)('httpTriggerLogger');
  const contextProvider = container.get(PLATFORM_CONTEXT_PROVIDER);
  const contextManager = container.get(PLATFORM_CONTEXT_MANAGER)
  await contextManager.runWithContext(contextProvider.providePlatformContext(invocationContext)
      .setValue(HTTP_REQUEST_CONTEXT_VALUE_KEY, req) , async () => {
    const wrappedContext = contextManager.active().invocationContext;
    const originalContext = contextProvider.active().get(ORIGINAL_INVOCATION_CONTEXT_VALUE_KEY);
    const originalReq = contextProvider.active().get(HTTP_REQUEST_CONTEXT_VALUE_KEY);
    logger.http(`Received HTTP request: ${originalReq.method} ${originalReq.url}`, {
      req: {
        method: originalReq.method,
        url: originalReq.url,
        headers: originalReq.headers,
        body: originalReq.body,
      }
    });
    // trigger handler logic
  });
}
```

#### Programming model v4
```typescript
export const HTTP_REQUEST_CONTEXT_VALUE_KEY =
  createPlatformContextValueKey<InvocationContext>('Original HTTP request');

    app.http('getAllTracks', {
      route: '/allTracks',
      methods: 'GET',
      handler: async (request: HttpRequest, invocationContext: InvocationContext) => {
        const logger = container.get(LOGGER_FACTORY)('httpTriggerLogger');
        const contextProvider = container.get(CONTEXT_PROVIDER);
        const contextManager = container.get(CONTEXT_MANAGER)
        await contextManager.runWithContext(contextProvider.providePlatformContext(invocationContext)
            .setValue(HTTP_REQUEST_CONTEXT_VALUE_KEY, request) , async () => {
          const wrappedContext = contextManager.active().invocationContext;
          const originalContext = contextProvider.active().get(ORIGINAL_INVOCATION_CONTEXT_VALUE_KEY);
          const originalReq = contextProvider.active().get(HTTP_REQUEST_CONTEXT_VALUE_KEY);
          logger.http(`Received HTTP request: ${originalReq.method} ${originalReq.url}`, {
            request: {
              method: request.method,
              url: request.url,
              headers: request.headers,
              body: request.text(),
            },
          });
          // trigger handler logic
        });
      }
    });

```

### Configuration of Azure Functions App
If the OTEL logger is configured, we should skip the system logs, provided by the extension.
However, we need the request entries to be provided to Application insights, so we can observe the trace entries over the Azure Porrtal view:

host.json:
```json
{
  "version": "2.0",
  "logging": {
    "loglevel": {
      "default": "None",
      "Host.Results": "Information"
    },
    "console": {
      "isEnabled": false
    }
  },
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle",
    "version": "[4.0.0, 5.0.0)"
  }
}
```

## Out of the scope

### Logger name provider
For the well-structured project the name for the logger can be taken from its project paths, started from src and ended with the name of the service class.

E.g. Service class TrackController, placed in 
 > `packages/examples/backend/src/interfaces/rest/console/trucks/trucks.controller.ts`

can have logger name 
 > `#backend.interfaces.rest.console.trucks.TrucksController`
 
Example:

at **TrucksController**.getTrucks (packages/examples/backend/src/**interfaces/rest/console/trucks**/trucks.controller.ts:54:16)

at processTicksAndRejections (node:internal/process/task_queues:105:5)

at packages/extensions/transaction-manager/src/Transactional-methods.ts:31:16

### Log level provider
The log level provider is responsible for providing the log level for a given logger name.
We can use so-called **Trie Search** algorithm to find the most specific log level for a given logger name, based on the configured log levels for different logger names.

if the most specific logger name for `#backend.interfaces.rest.console.trucks.TrucksController` 
is configured as `#backend.interfaces.rest` -> `verbose`
then the log level for `#backend.interfaces.rest.console.trucks.TrucksController` will be `verbose`, unless it is overridden by a more specific configuration.
If no log level is configured for the logger name, the global default log level will be used as a fallback.

### Log level persistence
In the distributed system, it is necessary to persist the log level configuration in a centralized storage, so that all instances of the application can access the same configuration.
Moreover, it is necessary to provide a mechanism for updating the log level configuration in real-time, so that changes can be propagated to all instances of the application without requiring a restart.

For this purpose, we can use a distributed cache like Redis or Hazelcast.

### Multiple transports
It is thinkable to have multiple transports for different log levels, so that we can route logs to different destinations based on their severity.
The cheap destinations with lower time-to-live can be used for lower log levels, while the more expensive destinations with higher time-to-live can be used for higher log levels.

For the lower log levels, we can use a BLOB Storage or a NoSQL database like CosmosDB, while for the higher log levels we can use a more expensive destination like Azure Application Insights.

### Batch log record processing
The logging system should support batch processing of log records, allowing developers to group multiple log entries together and send them to the logging destination in a single request, reducing the overhead of network communication and improving performance.

The processing should be configurable, allowing developers to specify the batch size, flush interval, queue size and export timeout, to optimize the performance and resource usage of the logging system based on the specific needs of the application.

This can be achieved by using the `BatchLogRecordProcessor` from the OpenTelemetry SDK.