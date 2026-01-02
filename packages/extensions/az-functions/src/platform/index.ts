import { Container } from 'inversify';
import * as process from 'node:process';
import { platformModeSchema } from 'shared';
import { AzurePlatform } from './azure-platform';
import { registerStartupService } from './startup.service';
import { extendPlatformContainer, getSystemContainer } from './system.container';

export * from '../http-controller/security';
export * from './model';
export { SecurityContext } from './security-context';
export { IStartupService, STARTUP_SERVICE } from './startup.service';

export * from '../event-hub-handler';
export * from '../http-controller';

export async function startPlatform(platformContainer: Container): Promise<void> {
  const platformMode = platformModeSchema.parse(process.env.PLATFORM_MODE);
  extendPlatformContainer(platformContainer);
  if (platformMode === 'start') {
    registerStartupService(platformContainer);
  }
  const systemContainer = getSystemContainer(platformContainer, platformMode);
  const azurePlatform = await systemContainer.getAsync(AzurePlatform);
  await azurePlatform.start();
}
