import { EventHubHandlersModule } from 'event-hub-handler';
import { HttpControllerModule } from 'http-controller';
import { BindToFluentSyntax, Container, ResolutionContext } from 'inversify';
import { mocked } from 'jest-mock';
import { mock, MockProxy } from 'jest-mock-extended';
import { LOGGER_FACTORY, LoggerConfiguration } from 'logger';
import { PlatformModule } from 'platform';
import { PLATFORM_CONTAINER, SharedModule } from 'shared';
import * as winston from 'winston';
import { createContainers } from './framework.container';
import { bindLoggerFactory } from './logger/bindings';
import { providePlatformContainer } from './platform.container';

jest.mock('inversify', () => {
  const original = jest.requireActual('inversify');
  return {
    ...original,
    Container: jest.fn(),
  };
});

jest.mock('./platform.container');
jest.mock('./logger/bindings');

describe('createContainers', () => {
  let mockFrameworkContainer: MockProxy<Container>;
  let mockPlatformContainer: MockProxy<Container>;
  let mockFluentSyntax: MockProxy<BindToFluentSyntax<unknown>>;
  let mockResolutionContext: MockProxy<ResolutionContext>;

  beforeEach(() => {
    mockFrameworkContainer = mock<Container>();
    mockPlatformContainer = mock<Container>();
    mockFluentSyntax = mock<BindToFluentSyntax<unknown>>();

    mocked(Container).mockReturnValue(mockFrameworkContainer);
    mocked(providePlatformContainer).mockReturnValue(mockPlatformContainer);
    mockFrameworkContainer.bind.mockReturnValue(mockFluentSyntax);

    mockResolutionContext = mock<ResolutionContext>();
  });

  it('should create container with singleton scope', () => {
    createContainers();

    expect(Container).toHaveBeenCalledWith({ defaultScope: 'Singleton' });
  });

  it('should load all required modules', () => {
    createContainers();

    expect(mockFrameworkContainer.loadSync).toHaveBeenCalledWith(
      SharedModule,
      PlatformModule,
      HttpControllerModule,
      EventHubHandlersModule,
    );
  });

  it('should create and bind platform container', () => {
    const loggerConfig = { level: 'info' } as unknown as LoggerConfiguration;

    createContainers(loggerConfig);

    expect(providePlatformContainer).toHaveBeenCalledWith(loggerConfig);
    expect(mockFrameworkContainer.bind).toHaveBeenCalledWith(PLATFORM_CONTAINER);
    expect(mockFluentSyntax.toConstantValue).toHaveBeenCalledWith(mockPlatformContainer);
  });

  it('should bind winston.Logger with dynamic value', () => {
    createContainers();

    expect(mockFrameworkContainer.bind).toHaveBeenCalledWith(winston.Logger);
    expect(mockFluentSyntax.toDynamicValue).toHaveBeenCalledWith(expect.any(Function));

    const loggerBinder = mockFluentSyntax.toDynamicValue.mock.calls[0]![0];
    loggerBinder(mockResolutionContext);
    expect(mockPlatformContainer.get).toHaveBeenCalledWith(winston.Logger);
  });

  it('should bind LOGGER_FACTORY with dynamic value', () => {
    createContainers();

    expect(mockFrameworkContainer.bind).toHaveBeenCalledWith(LOGGER_FACTORY);
    expect(mockFluentSyntax.toDynamicValue).toHaveBeenCalledWith(expect.any(Function));

    const factoryBinder = mockFluentSyntax.toDynamicValue.mock.calls[1]![0];
    factoryBinder(mockResolutionContext);
    expect(bindLoggerFactory).toHaveBeenCalledWith(mockResolutionContext);
  });

  it('should return the framework container', () => {
    const result = createContainers();

    expect(result).toEqual({
      frameworkContainer: mockFrameworkContainer,
      platformContainer: mockPlatformContainer,
    });
  });
});
