import { BindToFluentSyntax, ContainerModuleLoadOptions, ResolutionContext } from 'inversify';
import { mock, MockProxy } from 'jest-mock-extended';
import { LOGGER_NAME_PROVIDER, LoggerNameProvider } from 'logger';
import { AzurePlatform, PlatformModule, STARTUP_SERVICE } from './index';
import { REGISTER_TRIGGER_HANDLER_FACTORY, RegisterTriggerHandlerFactory } from './register-trigger-handler.factory';
import { systemLoggerNameProvider } from './system-logger-name.provider';

describe('exports', () => {
  it('should export AzurePlatform', () => {
    expect(STARTUP_SERVICE).toBeDefined();
  });
});

describe('PlatformModule', () => {
  let mockLoadOptions: MockProxy<ContainerModuleLoadOptions>;
  let mockAzurePlatformBinding: MockProxy<BindToFluentSyntax<AzurePlatform>>;
  let mockTriggerHandlerBinding: MockProxy<BindToFluentSyntax<RegisterTriggerHandlerFactory>>;
  let mockNameProviderBinding: MockProxy<BindToFluentSyntax<LoggerNameProvider>>;

  beforeEach(() => {
    mockLoadOptions = mock<ContainerModuleLoadOptions>();

    mockAzurePlatformBinding = mock<BindToFluentSyntax<AzurePlatform>>();
    mockLoadOptions.bind.calledWith(AzurePlatform).mockReturnValue(mockAzurePlatformBinding);

    mockTriggerHandlerBinding = mock<BindToFluentSyntax<RegisterTriggerHandlerFactory>>();
    mockLoadOptions.bind.calledWith(REGISTER_TRIGGER_HANDLER_FACTORY).mockReturnValue(mockTriggerHandlerBinding);

    mockNameProviderBinding = mock<BindToFluentSyntax<LoggerNameProvider>>();
    mockLoadOptions.bind.calledWith(LOGGER_NAME_PROVIDER).mockReturnValue(mockNameProviderBinding);
  });

  it('should bind AzurePlatform', async () => {
    await PlatformModule.load(mockLoadOptions);

    expect(mockLoadOptions.bind).toHaveBeenCalledWith(AzurePlatform);
    expect(mockAzurePlatformBinding.toSelf).toHaveBeenCalled();
  });

  it('should bind REGISTER_TRIGGER_HANDLER_FACTORY', async () => {
    await PlatformModule.load(mockLoadOptions);

    expect(mockLoadOptions.bind).toHaveBeenCalledWith(REGISTER_TRIGGER_HANDLER_FACTORY);
    expect(mockTriggerHandlerBinding.toFactory).toHaveBeenCalled();
  });

  it('should bind LOGGER_NAME_PROVIDER', async () => {
    await PlatformModule.load(mockLoadOptions);

    expect(mockLoadOptions.bind).toHaveBeenCalledWith(LOGGER_NAME_PROVIDER);
    expect(mockNameProviderBinding.toFactory).toHaveBeenCalled();

    const func = await mockNameProviderBinding.toFactory.mock.calls[0]![0]({} as ResolutionContext);

    expect(func).toBe(systemLoggerNameProvider);
  });
});
