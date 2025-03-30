import { app } from '@azure/functions';
import { BindInWhenOnFluentSyntax, BindToFluentSyntax, Container, ResolutionContext } from 'inversify';
import { DeepMockProxy, mock, mockDeep, MockProxy } from 'jest-mock-extended';
import * as process from 'process';
import { PLATFORM_CONTAINER, PLATFORM_MODE, sharedModule } from 'shared';
import { Logger } from 'winston';
import { AzurePlatform } from './azure-platform';
import { eventHubHandlersModule, httpControllerModule, platform, STARTUP_SERVICE } from './index';
import { PlatformComponentMetadataService } from './platform-component-metadata.service';
import { REGISTER_FUNCTIONS_FACTORY, registerFunctionsFactory } from './register-functions.factory';

jest.mock('inversify', () => {
  const original = jest.requireActual('inversify');
  return {
    ...original,
    Container: jest.fn(),
  };
});
jest.mock('@azure/functions');
jest.mock('./register-functions.factory');

describe('test platform', () => {
  let mockSystemContainer: MockProxy<Container>;
  let mockBindingTo: MockProxy<BindToFluentSyntax<unknown>>;
  let mockPlatformModeBinding: MockProxy<BindToFluentSyntax<unknown>>;
  let mockBindingInWhenOn: MockProxy<BindInWhenOnFluentSyntax<unknown>>;
  let mockAzurePlatform: MockProxy<AzurePlatform>;
  let mockPlatformContainer: DeepMockProxy<Container>;
  let prevPlatformMode: string | undefined;
  let mockAppStart: jest.Mock;
  let mockStartup: jest.Mock;
  let mockContext: MockProxy<ResolutionContext>;

  beforeEach(() => {
    mockSystemContainer = mock();
    jest.mocked(Container).mockReturnValue(mockSystemContainer);

    mockAppStart = jest.fn();
    app.hook.appStart = mockAppStart;

    mockBindingTo = mock();
    mockBindingInWhenOn = mock();
    mockPlatformModeBinding = mock();
    mockSystemContainer.bind.mockImplementation(serviceIdentifier => {
      if (serviceIdentifier === PLATFORM_MODE) {
        return mockPlatformModeBinding;
      }
      return mockBindingTo;
    });
    mockPlatformContainer = mockDeep();
    mockPlatformContainer.bind.mockReturnValue(mockPlatformModeBinding);
    mockStartup = jest.fn();
    mockPlatformContainer.get.calledWith(STARTUP_SERVICE).mockReturnValue({
      startup: mockStartup,
    });

    mockPlatformModeBinding.to.mockReturnValue(mockBindingInWhenOn);
    mockPlatformModeBinding.toSelf.mockReturnValue(mockBindingInWhenOn);
    mockPlatformModeBinding.toDynamicValue.mockReturnValue(mockBindingInWhenOn);

    mockAzurePlatform = mock();
    mockContext = mock();

    mockSystemContainer.getAsync.mockImplementation(async (serviceIdentifier): Promise<AzurePlatform | undefined> => {
      if (serviceIdentifier === AzurePlatform) {
        return mockAzurePlatform;
      }
    });
    prevPlatformMode = process.env.PLATFORM_MODE;
  });

  afterEach(() => {
    process.env.PLATFORM_MODE = prevPlatformMode;
    jest.clearAllMocks();
  });

  it('should initialize system container and start azure platform with function list', async () => {
    await platform(mockPlatformContainer);

    expect(mockSystemContainer.bind).toHaveBeenCalledWith(AzurePlatform);
    expect(mockPlatformContainer.bind).toHaveBeenCalledWith(Logger);
    expect(mockSystemContainer.bind).toHaveBeenCalledWith(PLATFORM_CONTAINER);
    expect(mockSystemContainer.bind).toHaveBeenCalledWith(PlatformComponentMetadataService);
    expect(mockSystemContainer.bind).toHaveBeenCalledWith(PLATFORM_MODE);
    expect(mockSystemContainer.bind).toHaveBeenCalledWith(REGISTER_FUNCTIONS_FACTORY);
    expect(mockSystemContainer.load).toHaveBeenCalledWith(sharedModule, httpControllerModule, eventHubHandlersModule);
    expect(mockPlatformModeBinding.toConstantValue).toHaveBeenCalledWith('start');
    expect(mockAppStart).toHaveBeenCalled();
    const startupMethod = mockAppStart.mock.calls[0][0];
    expect(mockStartup).not.toHaveBeenCalled();
    await startupMethod();
    expect(mockStartup).toHaveBeenCalled();

    const dynamicValueFunc = mockPlatformModeBinding.toDynamicValue.mock.calls[0]![0];
    expect(dynamicValueFunc(mockContext)).toBeInstanceOf(Logger);
    const factoryFunc = mockBindingTo.toFactory.mock.calls[0]![0] as any;
    factoryFunc(mockContext);
    expect(registerFunctionsFactory).toHaveBeenCalledWith(mockContext);
  });

  it('should print open api', async () => {
    process.env.PLATFORM_MODE = 'print-open-api';
    await platform(mockPlatformContainer);

    expect(mockSystemContainer.bind).toHaveBeenCalledWith(AzurePlatform);
    expect(mockAzurePlatform.start).toHaveBeenCalled();
    expect(mockPlatformModeBinding.toConstantValue).toHaveBeenCalledWith('print-open-api');
    expect(app.hook.appStart).not.toHaveBeenCalled();
  });
});
