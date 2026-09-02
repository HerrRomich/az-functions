import { inject, injectable } from 'inversify';
import { Migrator } from 'kysely/migration';
import { APP_CONFIG, AppConfig } from '../app-config';
import { FleetSightDatasource } from '../persistence';
import { FleetSightMigrationProvider } from './migration.provider';

export class MigrationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'MigrationError';
    Object.setPrototypeOf(this, MigrationError.prototype);
  }
}

@injectable()
export class FleetSightMigrationService {
  constructor(
    @inject(APP_CONFIG) private appConfig: AppConfig,
    private readonly dataSource: FleetSightDatasource,
    private readonly migrationProvider: FleetSightMigrationProvider,
  ) {}

  async migrateToLatest() {
    const { error, results } = await this.createMigrator().migrateToLatest();
    if (error !== undefined) {
      throw new MigrationError('Migration is failed', { cause: error });
    }
    return results;
  }

  private createMigrator(): Migrator {
    return new Migrator({
      db: this.dataSource,
      provider: this.migrationProvider,
      migrationTableSchema: this.appConfig.persistence.schema,
    });
  }
}
