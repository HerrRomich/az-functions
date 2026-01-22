import { inject } from '@angular/core';
import { FleetSightConfigService } from './fleet-sight-config.service';

export async function loadFleetSightConfig(): Promise<void> {
  const configserver = inject(FleetSightConfigService);
  await configserver.loadConfig();
}
