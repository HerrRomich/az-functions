import { app } from '@azure/functions';
import { Container } from 'inversify';
import { serviceIdentifier } from 'shared';

export interface IStartupService {
  startup(): Promise<void>;
}

export const STARTUP_SERVICE = serviceIdentifier<IStartupService>('STARTUP_SERVICE');

export function registerStartupService(platformContainer: Container): void {
  const startupService = platformContainer.get(STARTUP_SERVICE, { optional: true });
  if (startupService !== undefined) {
    app.hook.appStart(async () => {
      await startupService.startup();
    });
  }
}
