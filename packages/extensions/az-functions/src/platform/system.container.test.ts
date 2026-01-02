import { BindInWhenOnFluentSyntax, BindToFluentSyntax, Container, ResolutionContext } from 'inversify';
import { mock, MockProxy } from 'jest-mock-extended';
import { PLATFORM_CONTAINER, PLATFORM_MODE, PlatformContextLocalStorage, sharedModule } from 'shared';
import { eventHubHandlersModule } from '../event-hub-handler';
import { httpControllerModule } from '../http-controller';
import { loggerModule } from '../logger';
import { AzurePlatform } from './azure-platform';
import { PlatformComponentMetadataService } from './platform-component-metadata.service';
import { REGISTER_FUNCTION_FACTORY, registerFunctionFactory } from './register-function.factory';
import { SecurityContext } from './security-context';
import { extendPlatformContainer, getSystemContainer } from './system.container';

jest.mock('inversify', () => {
  const original = jest.requireActual('inversify');
  return {
    ...original,
    Container: jest.fn(),
  };
});

jest.mock('./register-function.factory', () => {
  const original = jest.requireActual('./register-function.factory');
  return {
    ...original,
    registerFunctionFactory: jest.fn(),
  };
});

describe('extendPlatformContainer', () => {
  let platformContainer: MockProxy<Container>;

  beforeEach(() => {
    platformContainer = mock<Container>();
  });

  it('should extend platform container', () => {
    const mockFluentSyntax = mock<BindToFluentSyntax<unknown>>();
    platformContainer.bind.mockReturnValue(mockFluentSyntax);
    const mockOnFluentSyntax = mock<BindInWhenOnFluentSyntax<unknown>>();
    mockFluentSyntax.toSelf.mockReturnValue(mockOnFluentSyntax);

    extendPlatformContainer(platformContainer);

    expect(platformContainer.bind).toHaveBeenCalledWith(SecurityContext);
    expect(platformContainer.bind).toHaveBeenCalledWith(PlatformContextLocalStorage);
    expect(platformContainer.loadSync).toHaveBeenCalledWith(loggerModule);
    expect(mockFluentSyntax.toSelf).toHaveBeenCalledTimes(2);
    expect(mockOnFluentSyntax.inSingletonScope).toHaveBeenCalledTimes(2);
  });
});

describe('getSystemContainer', () => {
  let platformContainer: MockProxy<Container>;
  let mockSystemContainer: MockProxy<Container>;

  beforeEach(() => {
    platformContainer = mock<Container>();
    mockSystemContainer = mock<Container>();

    jest.mocked(Container).mockReturnValue(mockSystemContainer);
  });

  it('should create and configure system container', () => {
    const mockFluentSyntax = mock<BindToFluentSyntax<unknown>>();
    mockSystemContainer.bind.mockReturnValue(mockFluentSyntax);

    const systemContainer = getSystemContainer(platformContainer, 'start');

    expect(systemContainer).toBe(mockSystemContainer);
    expect(Container).toHaveBeenCalledWith({ defaultScope: 'Singleton' });

    expect(mockSystemContainer.bind).toHaveBeenCalledWith(AzurePlatform);
    expect(mockSystemContainer.bind).toHaveBeenCalledWith(PlatformComponentMetadataService);
    expect(mockSystemContainer.bind).toHaveBeenCalledWith(PLATFORM_CONTAINER);
    expect(mockSystemContainer.bind).toHaveBeenCalledWith(PLATFORM_MODE);
    expect(mockSystemContainer.bind).toHaveBeenCalledWith(REGISTER_FUNCTION_FACTORY);
    expect(mockSystemContainer.loadSync).toHaveBeenCalledWith(
      sharedModule,
      httpControllerModule,
      eventHubHandlersModule,
      loggerModule,
    );
    expect(mockFluentSyntax.toSelf).toHaveBeenCalledTimes(2);
    expect(mockFluentSyntax.toConstantValue).toHaveBeenCalledTimes(2);
    expect(mockFluentSyntax.toFactory).toHaveBeenCalledOnce();

    const factoryCallback = mockFluentSyntax.toFactory.mock.lastCall![0]! as (context: ResolutionContext) => any;
    const mockcontext = mock<ResolutionContext>();
    factoryCallback(mockcontext);

    expect(registerFunctionFactory).toHaveBeenCalledWith(mockcontext);
  });
});
