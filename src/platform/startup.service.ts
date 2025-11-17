import { serviceIdentifier } from 'shared';

export interface StartupService {
  startup(): Promise<void>;
}

export const STARTUP_SERVICE = serviceIdentifier<StartupService>('STARTUP_SERVICE');
