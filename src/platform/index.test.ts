import { app } from '@azure/functions';
import { Container, interfaces } from 'inversify';
import { DeepMockProxy, mock, mockDeep, MockProxy } from 'jest-mock-extended';
import * as process from 'process';
import { PLATFORM_CONTAINER, PLATFORM_MODE, sharedModule } from 'shared';
import { AzurePlatform } from './azure-platform';
import { eventHubHandlersModule, httpControllerModule, platform, STARTUP_SERVICE, StartupService } from './index';
import { PlatformComponentMetadataService } from './platform-component-metadata.service';
import { REGISTER_FUNCTIONS_FACTORY } from './register-functions.factory';

jest.mock('inversify', () => {
  const original = jest.requireActual('inversify');
  return {
    ...original,
    Container: jest.fn(),
  };
});
jest.mock('@azure/functions');

describe('test platform', () => {
  let mockContainer: MockProxy<Container>;
  let mockBindingTo: MockProxy<interfaces.BindingToSyntax<unknown>>;
  let mockPlatformModeBinding: MockProxy<interfaces.BindingToSyntax<unknown>>;
  let mockBindingIn: MockProxy<interfaces.BindingInWhenOnSyntax<unknown>>;
  let mockBindingInWhenOn: MockProxy<interfaces.BindingInWhenOnSyntax<unknown>>;
  let mockAzurePlatform: MockProxy<AzurePlatform>;
  let mockPlatformContainer: DeepMockProxy<Container>;
  let prevPlatformMode: string | undefined;
  let mockAppStart: jest.Mock;
  let startupCounter = 0;

  beforeEach(() => {
    mockContainer = mock();
    jest.mocked(Container).mockReturnValue(mockContainer);

    mockAppStart = jest.fn();
    app.hook.appStart = mockAppStart;

    mockBindingTo = mock();
    mockBindingInWhenOn = mock();
    mockPlatformModeBinding = mock();
    mockContainer.bind.mockImplementation((serviceIdentifier) => {
      if (serviceIdentifier === PLATFORM_MODE) {
        return mockPlatformModeBinding;
      }
      return mockBindingTo;
    });
    mockPlatformContainer = mockDeep();
    mockPlatformContainer.bind.mockReturnValue(mockPlatformModeBinding);
    mockPlatformContainer.isBound.calledWith(STARTUP_SERVICE).mockReturnValue(true);
    mockPlatformContainer.get.calledWith(STARTUP_SERVICE).mockReturnValue({
      startup: async () => {
        startupCounter++;
      },
    } as StartupService);

    mockBindingIn = mock();
    mockPlatformModeBinding.to.mockReturnValue(mockBindingIn);
    mockPlatformModeBinding.toSelf.mockReturnValue(mockBindingInWhenOn);
    mockPlatformModeBinding.toDynamicValue.mockReturnValue(mockBindingInWhenOn);

    mockAzurePlatform = mock();

    mockContainer.getAsync.mockImplementation(async (serviceIdentifier): Promise<AzurePlatform | undefined> => {
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

    expect(mockContainer.bind).toHaveBeenCalledWith(AzurePlatform);
    expect(mockContainer.bind).toHaveBeenCalledWith(PLATFORM_CONTAINER);
    expect(mockContainer.bind).toHaveBeenCalledWith(PlatformComponentMetadataService);
    expect(mockContainer.bind).toHaveBeenCalledWith(PLATFORM_MODE);
    expect(mockContainer.bind).toHaveBeenCalledWith(REGISTER_FUNCTIONS_FACTORY);
    expect(mockContainer.load).toHaveBeenCalledWith(sharedModule);
    expect(mockContainer.load).toHaveBeenCalledWith(httpControllerModule);
    expect(mockContainer.load).toHaveBeenCalledWith(eventHubHandlersModule);
    expect(mockPlatformModeBinding.toConstantValue).toHaveBeenCalledWith('start');
    expect(mockAppStart).toHaveBeenCalled();
    const startupMethod = mockAppStart.mock.calls[0][0];
    expect(startupCounter).toEqual(0);
    await startupMethod();
    expect(startupCounter).toEqual(1);
  });

  it('should print open api', async () => {
    process.env.PLATFORM_MODE = 'print-open-api';
    await platform(mockPlatformContainer);

    expect(mockContainer.bind).toHaveBeenCalledWith(AzurePlatform);
    expect(mockAzurePlatform.start).toHaveBeenCalled();
    expect(mockPlatformModeBinding.toConstantValue).toHaveBeenCalledWith('print-open-api');
    expect(app.hook.appStart).not.toHaveBeenCalled();
  });
});
