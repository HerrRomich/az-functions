import { serviceIdentifier } from '@herrromich/az-functions';
import { Migration } from 'kysely';

export const MIGRATION = serviceIdentifier<IFleetSightMigration>('MIGRATION');

export interface IFleetSightMigration extends Migration {
  readonly name: string;
}
