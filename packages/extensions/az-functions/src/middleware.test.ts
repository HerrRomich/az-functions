import { OpenApiPrintService, OpenApiRegistrationService } from 'http-controller';
import { Container, ContainerModule } from 'inversify';
import { spyOn } from 'jest-mock';
import { mock, MockProxy } from 'jest-mock-extended';
import { Logger, LOGGER_FACTORY } from 'logger';
import { AzurePlatform, PlatformConfiguration } from 'platform';
import { TriggerHandlerClass } from 'shared';
import { getPartialFixture } from 'test-utilities';
import { createContainers } from './framework.container';
import { startPlatform } from './middleware';

jest.mock('./framework.container');

describe('middleware', () => {
  describe('startPlatform', () => {
    const OLD_ENV = process.env;
    const testConfig = getPartialFixture<PlatformConfiguration>({
      loggerConfiguration: {},
      triggerHandlerClasses: [mock<TriggerHandlerClass>(), mock<TriggerHandlerClass>(), mock<TriggerHandlerClass>()],
      modules: [mock<ContainerModule>(), mock<ContainerModule>(), mock<ContainerModule>()],
    });

    let mockFrameworkContainer: MockProxy<Container>;
    let mockPlatformContainer: MockProxy<Container>;
    let mockLogger: MockProxy<Logger>;

    let mockOpenApiRegistrationService: MockProxy<OpenApiRegistrationService>;
    let spyProcessOn: jest.SpyInstance;

    beforeEach(() => {
      process.env = { ...OLD_ENV };

      mockFrameworkContainer = mock<Container>();
      mockPlatformContainer = mock<Container>();
      jest.mocked(createContainers).mockReturnValue({
        frameworkContainer: mockFrameworkContainer,
        platformContainer: mockPlatformContainer,
      });

      mockLogger = mock<Logger>();
      mockFrameworkContainer.get.calledWith(LOGGER_FACTORY).mockReturnValue(() => mockLogger);

      mockOpenApiRegistrationService = mock<OpenApiRegistrationService>();
      mockFrameworkContainer.get
        .calledWith(OpenApiRegistrationService)
        .mockReturnValueOnce(mockOpenApiRegistrationService);
      spyProcessOn = spyOn(process, 'on').mockImplementation(() => process);
    });

    afterEach(() => {
      spyProcessOn.mockRestore();
      process.env = OLD_ENV;
    });

    it('should only print OpenAPI definitions when PLATFORM_MODE is set to print-open-api', () => {
      process.env.PLATFORM_MODE = 'print-open-api';
      const mockOpenApiPrintService = mock<OpenApiPrintService>();
      mockFrameworkContainer.get.calledWith(OpenApiPrintService).mockReturnValueOnce(mockOpenApiPrintService);

      const platformContainer = startPlatform(testConfig);

      expect(platformContainer).toBe(mockPlatformContainer);
      expect(mockFrameworkContainer.get).toHaveBeenCalledWith(OpenApiRegistrationService);
      expect(mockOpenApiRegistrationService.register).toHaveBeenCalledWith({
        triggerHandlerClasses: testConfig.triggerHandlerClasses,
        restApplications: testConfig.restApplications,
      });

      expect(mockOpenApiPrintService.printOpenApi).toHaveBeenCalled();
      expect(mockPlatformContainer.loadSync).not.toHaveBeenCalled();
    });

    it('should start the platform when PLATFORM_MODE is set to start', () => {
      process.env.PLATFORM_MODE = 'start';
      const mockAzurePlatform = mock<AzurePlatform>();
      mockFrameworkContainer.get.calledWith(AzurePlatform).mockReturnValueOnce(mockAzurePlatform);

      const platformContainer = startPlatform(testConfig);

      expect(platformContainer).toBe(mockPlatformContainer);
      expect(mockFrameworkContainer.get).toHaveBeenCalledWith(OpenApiRegistrationService);
      expect(mockOpenApiRegistrationService.register).toHaveBeenCalledWith({
        triggerHandlerClasses: testConfig.triggerHandlerClasses,
        restApplications: testConfig.restApplications,
      });
      expect(mockFrameworkContainer.get).toHaveBeenCalledWith(AzurePlatform);
      expect(mockAzurePlatform.start).toHaveBeenCalledWith(testConfig.triggerHandlerClasses);

      expect(mockPlatformContainer.loadSync).toHaveBeenCalledWith(...testConfig.modules);
    });

    it('shold register uncaughtException', () => {
      process.env.PLATFORM_MODE = 'start';
      const mockAzurePlatform = mock<AzurePlatform>();
      mockFrameworkContainer.get.calledWith(AzurePlatform).mockReturnValueOnce(mockAzurePlatform);

      startPlatform(testConfig);

      expect(spyProcessOn).toHaveBeenCalledWith('uncaughtException', expect.any(Function));

      const uncaughtExceptionCallback = spyProcessOn.mock.calls[0]?.[1];
      expect(uncaughtExceptionCallback).toBeDefined();
      const testError = new Error('Test uncaught exception');
      uncaughtExceptionCallback!(testError);

      expect(mockLogger.error).toHaveBeenCalledWith('Uncaught exception occurred', testError);
    });

    it('should register unhandledRejection', () => {
      process.env.PLATFORM_MODE = 'start';
      const mockAzurePlatform = mock<AzurePlatform>();
      mockFrameworkContainer.get.calledWith(AzurePlatform).mockReturnValueOnce(mockAzurePlatform);

      startPlatform(testConfig);

      expect(spyProcessOn).toHaveBeenCalledWith('unhandledRejection', expect.any(Function));

      const unhandledRejectionCallback = spyProcessOn.mock.calls[1]?.[1];
      expect(unhandledRejectionCallback).toBeDefined();
      const testReason = 'Test unhandled rejection';
      unhandledRejectionCallback!(testReason);

      expect(mockLogger.error).toHaveBeenCalledWith('Unhandled promise rejection occurred', { reason: testReason });
    });

    it('should log error and throw if an error occurs during platform start', () => {
      const mockAzurePlatform = mock<AzurePlatform>();
      mockFrameworkContainer.get.calledWith(AzurePlatform).mockReturnValueOnce(mockAzurePlatform);
      const testError = new Error('Test error');
      mockAzurePlatform.start.mockImplementationOnce(() => {
        throw testError;
      });

      expect(() => startPlatform(testConfig)).toThrow(testError);
      expect(mockLogger.error).toHaveBeenCalledWith('Error occurred during platform start', testError);
    });
  });
});
