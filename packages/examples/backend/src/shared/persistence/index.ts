import { serviceIdentifier } from '@herrromich/az-functions';
import { DataSource, registerDataSource } from '@herrromich/transaction-manager';
import { ContainerModule, decorate, injectable } from 'inversify';
import { CamelCasePlugin, CompiledQuery, Kysely, PostgresDialect } from 'kysely';
import * as process from 'node:process';
import { Pool, types } from 'pg';
import { DashboardRepository } from 'shared/persistence/features/fleet';
import * as wkx from 'wkx';
import { IFleetSightDatabase } from './database';

export { IFleetSightDatabase } from './database';
export { TruckTable } from './features/fleet/truck.table';

export const PG_POOL_PROVIDER = serviceIdentifier<PoolProvider>('PG_POOL_PROVIDER');
export type PoolProvider = () => Promise<Pool>;

export const DB_FACTORY = serviceIdentifier<DbFactory>('DB_FACTORY');

export type DbFactory = () => Kysely<IFleetSightDatabase>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
types.setTypeParser(20134 as any, val => {
  return wkx.Geometry.parse(Buffer.from(val, 'hex')).toGeoJSON();
});
types.setTypeParser(1700, (val: string) => parseFloat(val));

decorate(injectable(), DataSource);
export const persistenceModule = new ContainerModule(({ bind }) => {
  bind<PoolProvider>(PG_POOL_PROVIDER).toFactory(
    () => async () =>
      new Pool({
        connectionString: process.env.PostgresConnectionString,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      }),
  );
  bind(DB_FACTORY).toFactory(context => <T>() => {
    const poolProvider = context.get(PG_POOL_PROVIDER);
    const pgDialect = new PostgresDialect({
      pool: poolProvider,
      onCreateConnection: async connection => {
        await connection.executeQuery(CompiledQuery.raw(`SET search_path TO '${process.env.PostgresSchema}';`));
      },
    });
    return new Kysely<T>({
      dialect: pgDialect,
      plugins: [new CamelCasePlugin()],
    });
  });

  bind(DataSource<IFleetSightDatabase>).toDynamicValue(context =>
    registerDataSource(() => {
      const dbFactory = context.get(DB_FACTORY);
      return dbFactory();
    }),
  );

  bind(DashboardRepository).toSelf();
});
