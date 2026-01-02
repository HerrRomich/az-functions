import { DataSource } from '@herrromich/transaction-manager';
import { injectable } from 'inversify';
import { Migrator } from 'kysely';
import process from 'node:process';
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
    private readonly dataSource: DataSource<unknown>,
    private readonly migrationProvider: FleetSightMigrationProvider,
  ) {}

  async migrateToLatest() {
    const { error } = await this.createMigrator().migrateToLatest();
    if (error !== undefined) {
      throw new MigrationError('Migration is failed', { cause: error });
    }
  }

  private createMigrator(): Migrator {
    return new Migrator({
      db: this.dataSource,
      provider: this.migrationProvider,
      migrationTableSchema: process.env.PostgresSchema,
    });
  }
}
