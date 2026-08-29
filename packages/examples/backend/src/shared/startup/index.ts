import { STARTUP_SERVICE } from '@herrromich/az-functions';
import { ContainerModule } from 'inversify';
import { MIGRATION } from './migration.model';
import { FleetSightMigrationProvider } from './migration.provider';
import { FleetSightMigrationService } from './migration.service';
import { InitialMigration } from './migrations/2024-06-01T12_00_00-initial/2024-06-01T12_00_00-initial.migration';
import { StartupService } from './startup.service';

export const StartupModule = new ContainerModule(({ bind }) => {
  bind(STARTUP_SERVICE).to(StartupService);

  bind(FleetSightMigrationProvider).toSelf();
  bind(FleetSightMigrationService).toSelf();

  // migrations
  bind(MIGRATION).to(InitialMigration);
});
