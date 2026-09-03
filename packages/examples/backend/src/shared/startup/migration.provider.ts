import { injectable, multiInject } from 'inversify';
import { Kysely } from 'kysely';
import { Migration, MigrationProvider } from 'kysely/migration';
import { IFleetSightMigration, MIGRATION } from './migration.model';

@injectable()
export class FleetSightMigrationProvider implements MigrationProvider {
  constructor(@multiInject(MIGRATION) private readonly migrations: IFleetSightMigration[]) {}
  async getMigrations(): Promise<Record<string, Migration>> {
    return this.migrations.reduce(
      (prev, curr) => {
        // Kysely uses spread operator internally, so we need to create a new object with methods defined as prop
        const migration: Migration = {
          up: async (db: Kysely<unknown>): Promise<void> => {
            await curr.up(db);
          },
        };
        const downMethod = curr.down;
        if (downMethod) {
          migration.down = async (db: Kysely<unknown>): Promise<void> => {
            await downMethod(db);
          };
        }
        prev[curr.name] = migration;
        return prev;
      },
      {} as Record<string, Migration>,
    );
  }
}
