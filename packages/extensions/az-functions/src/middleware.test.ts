import { getPartialFixture } from '@utilities/test-utilities';
import { OpenApiPrintService, OpenApiRegistrationService } from 'http-controller';
import { Container, ContainerModule } from 'inversify';
import { mock, MockProxy } from 'jest-mock-extended';
import { Logger, LOGGER_FACTORY } from 'logger';
import { AzurePlatform, PlatformConfiguration } from 'platform';
import { TriggerHandlerClass } from 'shared';
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

    let mockOpenApiRegistrationService: MockProxy<OpenApiRegistrationService>;

    beforeEach(() => {
      process.env = { ...OLD_ENV };

      mockFrameworkContainer = mock<Container>();
      mockPlatformContainer = mock<Container>();
      jest.mocked(createContainers).mockReturnValue({
        frameworkContainer: mockFrameworkContainer,
        platformContainer: mockPlatformContainer,
      });

      mockOpenApiRegistrationService = mock<OpenApiRegistrationService>();
      mockFrameworkContainer.get
        .calledWith(OpenApiRegistrationService)
        .mockReturnValueOnce(mockOpenApiRegistrationService);
      mockFrameworkContainer.get.calledWith(LOGGER_FACTORY).mockReturnValueOnce(() => mock<Logger>());
    });

    afterEach(() => {
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
  });
});
