import { Container } from 'inversify';
import { mock, MockProxy } from 'jest-mock-extended';
import * as process from 'process';
import { AzurePlatform } from './azure-platform';
import { startPlatform } from './index';
import { registerStartupService } from './startup.service';
import { extendPlatformContainer, getSystemContainer } from './system.container';

jest.mock('./startup.service');
jest.mock('./system.container');
jest.mock('inversify', () => {
  const original = jest.requireActual('inversify');
  return {
    ...original,
    Container: jest.fn(),
  };
});

describe('startPlatform', () => {
  const originalEnv = process.env;

  let platformContainer: MockProxy<Container>;
  let systemContainer: MockProxy<Container>;
  let azurePlatform: MockProxy<AzurePlatform>;

  beforeEach(() => {
    platformContainer = mock<Container>();

    systemContainer = mock<Container>();
    jest.mocked(getSystemContainer).mockReturnValueOnce(systemContainer);

    azurePlatform = mock<AzurePlatform>();
    systemContainer.getAsync.calledWith(AzurePlatform).mockResolvedValue(azurePlatform);
  });

  afterEach(() => {
    (process as any).env = originalEnv;
    jest.resetAllMocks();
  });

  it.each(['start', 'other'])('should start platform in start displayMode', async mode => {
    process.env.PLATFORM_MODE = mode;

    await startPlatform(platformContainer);

    expect(extendPlatformContainer).toHaveBeenCalledWith(platformContainer);
    expect(registerStartupService).toHaveBeenCalledWith(platformContainer);
    expect(getSystemContainer).toHaveBeenCalledWith(platformContainer, 'start');
    expect(systemContainer.getAsync).toHaveBeenCalledWith(AzurePlatform);
    expect(azurePlatform.start).toHaveBeenCalled();
  });

  it('should start platform in other displayMode', async () => {
    process.env.PLATFORM_MODE = 'print-open-api';

    await startPlatform(platformContainer);

    expect(extendPlatformContainer).toHaveBeenCalledWith(platformContainer);
    expect(registerStartupService).not.toHaveBeenCalled();
    expect(getSystemContainer).toHaveBeenCalledWith(platformContainer, 'print-open-api');
    expect(systemContainer.getAsync).toHaveBeenCalledWith(AzurePlatform);
    expect(azurePlatform.start).toHaveBeenCalled();
  });
});
