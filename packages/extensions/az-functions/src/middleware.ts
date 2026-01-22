import { OpenApiPrintService, OpenApiRegistrationService } from 'http-controller';
import { Container } from 'inversify';
import { LOGGER_FACTORY, SYSTEM_LOGGER_NAME_PREFIX } from 'logger';
import { AzurePlatform, PlatformConfiguration } from 'platform';
import { platformModeSchema } from 'shared';
import { createContainers } from './framework.container';

function registerOpenApi(frameworkContainer: Container, config: PlatformConfiguration) {
  const openApiRegistrationService = frameworkContainer.get(OpenApiRegistrationService);
  openApiRegistrationService.register({
    triggerHandlerClasses: config.triggerHandlerClasses,
    restApplications: config.restApplications,
  });
}

/**
 * Starts the platform based on the provided configuration and the current platform mode.
 *
 * The function initializes the necessary containers and services, and then either prints the OpenAPI specification or starts the platform with the registered trigger handlers.
 * @param config The platform configuration.
 * @returns The platform container.
 */
export function startPlatform(config: PlatformConfiguration): Container {
  const platformMode = platformModeSchema.parse(process.env.PLATFORM_MODE);
  const { frameworkContainer, platformContainer } = createContainers(config.loggerConfiguration);
  const loggerFactory = frameworkContainer.get(LOGGER_FACTORY);
  const logger = loggerFactory(`${SYSTEM_LOGGER_NAME_PREFIX}.platform`);
  logger.info(`Starting platform in mode: ${platformMode}`);
  try {
    switch (platformMode) {
      case 'print-open-api': {
        registerOpenApi(frameworkContainer, config);
        frameworkContainer.get(OpenApiPrintService).printOpenApi();
        break;
      }
      case 'start': {
        platformContainer.loadSync(...config.modules);
        registerOpenApi(frameworkContainer, config);
        const azurePlatform = frameworkContainer.get(AzurePlatform);
        azurePlatform.start(config.triggerHandlerClasses);
        break;
      }
    }
  } catch (error) {
    logger.error('Error occurred while starting the platform', error);
    throw error;
  }
  return platformContainer;
}
