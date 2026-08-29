import {
  BasePlatformContextManager,
  PLATFORM_CONTEXT_MANAGER,
  PLATFORM_CONTEXT_PROVIDER,
  PlatformExecutionContextProvider,
} from 'context';
import { BindInWhenOnFluentSyntax, BindToFluentSyntax, Container, ContainerModule } from 'inversify';
import { mock, MockProxy } from 'jest-mock-extended';
import { LoggerConfiguration, provideLoggerModule } from 'logger';
import { SecurityContext } from 'security';
import { providePlatformContainer } from './platform.container';

jest.mock('inversify', () => {
  const original = jest.requireActual('inversify');
  return {
    ...original,
    Container: jest.fn(),
  };
});

jest.mock('logger');

describe('providePlatformContainer', () => {
  let mockContainer: MockProxy<Container>;
  let mockFluentSyntax: MockProxy<BindToFluentSyntax<unknown>>;
  let mockOnFluentSyntax: MockProxy<BindInWhenOnFluentSyntax<unknown>>;
  let mockLoggerModule: ContainerModule;

  beforeEach(() => {
    mockContainer = mock<Container>();
    mockFluentSyntax = mock<BindToFluentSyntax<unknown>>();
    mockOnFluentSyntax = mock<BindInWhenOnFluentSyntax<unknown>>();
    mockLoggerModule = mock<ContainerModule>();

    jest.mocked(Container).mockReturnValue(mockContainer);
    jest.mocked(provideLoggerModule).mockReturnValue(mockLoggerModule);
    mockContainer.bind.mockReturnValue(mockFluentSyntax);
    mockFluentSyntax.to.mockReturnValue(mockOnFluentSyntax);
    mockFluentSyntax.toSelf.mockReturnValue(mockOnFluentSyntax);
  });

  it('should create container with singleton scope', () => {
    providePlatformContainer(undefined);

    expect(Container).toHaveBeenCalledWith({ defaultScope: 'Singleton' });
  });

  it('should bind PLATFORM_CONTEXT_MANAGER to BasePlatformContextManager', () => {
    providePlatformContainer(undefined);

    expect(mockContainer.bind).toHaveBeenCalledWith(PLATFORM_CONTEXT_MANAGER);
    expect(mockFluentSyntax.to).toHaveBeenCalledWith(BasePlatformContextManager);
  });

  it('should load logger module with provided configuration', () => {
    const loggerConfig = { level: 'info' } as unknown as LoggerConfiguration;

    providePlatformContainer(loggerConfig);

    expect(provideLoggerModule).toHaveBeenCalledWith(loggerConfig);
    expect(mockContainer.loadSync).toHaveBeenCalledWith(mockLoggerModule);
  });

  it('should load logger module with undefined configuration', () => {
    providePlatformContainer(undefined);

    expect(provideLoggerModule).toHaveBeenCalledWith(undefined);
    expect(mockContainer.loadSync).toHaveBeenCalledWith(mockLoggerModule);
  });

  it('should eagerly resolve PLATFORM_CONTEXT_MANAGER', () => {
    providePlatformContainer(undefined);

    expect(mockContainer.get).toHaveBeenCalledWith(PLATFORM_CONTEXT_MANAGER);
  });

  it('should bind SecurityContext to self', () => {
    providePlatformContainer(undefined);

    expect(mockContainer.bind).toHaveBeenCalledWith(SecurityContext);
    expect(mockFluentSyntax.toSelf).toHaveBeenCalled();
  });

  it('should bind PLATFORM_CONTEXT_PROVIDER to PlatformExecutionContextProvider', () => {
    providePlatformContainer(undefined);

    expect(mockContainer.bind).toHaveBeenCalledWith(PLATFORM_CONTEXT_PROVIDER);
    expect(mockFluentSyntax.to).toHaveBeenCalledWith(PlatformExecutionContextProvider);
  });

  it('should return the platform container', () => {
    const result = providePlatformContainer(undefined);

    expect(result).toBe(mockContainer);
  });
});
