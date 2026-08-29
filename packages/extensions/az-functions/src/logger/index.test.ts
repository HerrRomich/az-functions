import { BindToFluentSyntax, ContainerModuleLoadOptions, ResolutionContext } from 'inversify';
import { mock, MockProxy } from 'jest-mock-extended';
import * as winston from 'winston';
import { bindLoggerFactory, bindOtelLoggerProvider, bindWinstonLogger } from './bindings';
import {
  DEFAULT_LOG_LEVEL,
  LOGGER_FACTORY,
  LOGGER_PROVIDER,
  LoggerConfiguration,
  LoggerFactory,
  provideLoggerModule,
} from './index';
import { LogLevelService } from './log-level.service';
import { AzFunctionsTransport } from './log-transport.service';
import { OtelLogger } from './otel.logger';

jest.mock('./bindings');

describe('provideLoggerModule', () => {
  const config: LoggerConfiguration = {
    otelConfiguration: {
      applicationInsightsConnectionString: 'test-connection-string',
      serviceName: 'test-service',
      serviceInstanceId: 'test-instance',
      serviceVersion: '1.0.0',
    },
  };

  let mockLoadOptions: MockProxy<ContainerModuleLoadOptions>;

  beforeEach(() => {
    mockLoadOptions = mock<ContainerModuleLoadOptions>();

    mockLoadOptions.bind.mockImplementation(() => mock<BindToFluentSyntax<any>>());
  });

  it('should bind 5 services when no otelConfiguration is provided', async () => {
    await provideLoggerModule().load(mockLoadOptions);

    expect(mockLoadOptions.bind).toHaveBeenCalledTimes(5);
  });

  it('should bind 7 services when otelConfiguration is provided', async () => {
    await provideLoggerModule(config).load(mockLoadOptions);

    expect(mockLoadOptions.bind).toHaveBeenCalledTimes(7);
  });

  it('should bind LogLevelService', async () => {
    await provideLoggerModule().load(mockLoadOptions);

    expect(mockLoadOptions.bind).toHaveBeenNthCalledWith(1, LogLevelService);

    const result = mockLoadOptions.bind.mock.results[0]!.value as BindToFluentSyntax<LogLevelService>;
    expect(result.toSelf).toHaveBeenCalled();
  });

  it('should bind LogTransportService', async () => {
    await provideLoggerModule().load(mockLoadOptions);

    expect(mockLoadOptions.bind).toHaveBeenNthCalledWith(2, AzFunctionsTransport);

    const mockBindSyntax = mockLoadOptions.bind.mock.results[1]!.value as BindToFluentSyntax<AzFunctionsTransport>;
    expect(mockBindSyntax.toSelf).toHaveBeenCalled();
  });

  it('should bind logger', async () => {
    await provideLoggerModule().load(mockLoadOptions);

    expect(mockLoadOptions.bind).toHaveBeenNthCalledWith(3, winston.Logger);

    const mockBindSyntax = mockLoadOptions.bind.mock.results[2]!.value as jest.Mocked<
      BindToFluentSyntax<winston.Logger>
    >;
    expect(mockBindSyntax.toDynamicValue).toHaveBeenCalledWith(expect.any(Function));
    const mockDynamicBinding = mockBindSyntax.toDynamicValue.mock.calls[0]![0];
    const mockContext = mock<ResolutionContext>();
    await mockDynamicBinding(mockContext);
    expect(bindWinstonLogger).toHaveBeenCalledWith(mockContext);
  });

  it('should bind logger factory', async () => {
    await provideLoggerModule().load(mockLoadOptions);

    expect(mockLoadOptions.bind).toHaveBeenNthCalledWith(4, LOGGER_FACTORY);

    const mockBindSyntax = mockLoadOptions.bind.mock.results[3]!.value as jest.Mocked<
      BindToFluentSyntax<LoggerFactory>
    >;
    expect(mockBindSyntax.toFactory).toHaveBeenCalled();
    const mockFactoryBinding = mockBindSyntax.toFactory.mock.calls[0]![0];
    const mockContext = mock<ResolutionContext>();
    await mockFactoryBinding(mockContext);
    expect(bindLoggerFactory).toHaveBeenCalledWith(mockContext);
  });

  it('should bind default log level without config', async () => {
    await provideLoggerModule().load(mockLoadOptions);

    expect(mockLoadOptions.bind).toHaveBeenNthCalledWith(5, DEFAULT_LOG_LEVEL);

    const mockBindSyntax = mockLoadOptions.bind.mock.results[4]!.value as jest.Mocked<BindToFluentSyntax<string>>;
    expect(mockBindSyntax.toConstantValue).toHaveBeenCalledWith('info');
  });

  it('should bind default log level with config', async () => {
    const config: LoggerConfiguration = { defaultLogLevel: 'debug' };
    await provideLoggerModule(config).load(mockLoadOptions);

    expect(mockLoadOptions.bind).toHaveBeenNthCalledWith(5, DEFAULT_LOG_LEVEL);

    const mockBindSyntax = mockLoadOptions.bind.mock.results[4]!.value as jest.Mocked<BindToFluentSyntax<string>>;
    expect(mockBindSyntax.toConstantValue).toHaveBeenCalledWith('debug');
  });

  it('should bind OtelLogger if configuration is provided', async () => {
    await provideLoggerModule(config).load(mockLoadOptions);

    expect(mockLoadOptions.bind).toHaveBeenNthCalledWith(6, OtelLogger);

    const mockBindSyntax = mockLoadOptions.bind.mock.results[5]!.value as jest.Mocked<BindToFluentSyntax<OtelLogger>>;
    expect(mockBindSyntax.toSelf).toHaveBeenCalled();
  });

  it('should bind LOGGER_PROVIDER if configuration is provided', async () => {
    await provideLoggerModule(config).load(mockLoadOptions);

    expect(mockLoadOptions.bind).toHaveBeenNthCalledWith(7, LOGGER_PROVIDER);

    const mockBindSyntax = mockLoadOptions.bind.mock.results[6]!.value as jest.Mocked<BindToFluentSyntax<any>>;
    expect(mockBindSyntax.toDynamicValue).toHaveBeenCalled();

    const mockDynamicBinding = mockBindSyntax.toDynamicValue.mock.calls[0]![0];
    const mockContext = mock<ResolutionContext>();
    await mockDynamicBinding(mockContext);
    expect(bindOtelLoggerProvider).toHaveBeenCalledWith(config.otelConfiguration);
  });
});
