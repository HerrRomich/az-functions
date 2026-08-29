import { LOGGER_FACTORY, serviceIdentifier } from '@herrromich/az-functions';
import { DataSource, registerDataSource } from '@herrromich/transaction-manager';
import { ContainerModule } from 'inversify';
import { CamelCasePlugin, Dialect, Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { APP_CONFIG } from '../../app-config';
import { LOGGER_NAME_PREFIX } from '../../logger';
import { IFleetSightDatabase } from '../database';
import { initPersistence } from './init';

type PoolProvider = () => Pool;
export const PG_POOL_PROVIDER = serviceIdentifier<PoolProvider>('PG_POOL_PROVIDER');

type DialectFactory = () => Dialect;
export const KYSELY_DIALECT_FACTORY = serviceIdentifier<DialectFactory>('KYSELY_DIALECT');

export type DbFactory = () => Kysely<IFleetSightDatabase>;
export const DB_FACTORY = serviceIdentifier<DbFactory>('DB_FACTORY');

export const PERSISTENCE_KYSELY_LOGGER_NAME = `${LOGGER_NAME_PREFIX}.shared.persistence.kysely`;
export class FleetSightDatasource extends DataSource<IFleetSightDatabase> {}

export const PersistenceModule = new ContainerModule(({ bind }) => {
  bind(PG_POOL_PROVIDER).toFactory(context => () => {
    const appConfig = context.get(APP_CONFIG);
    return new Pool({
      connectionString: appConfig.persistence.connectionString,
      ssl: appConfig.persistence.secureConnection,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  });
  bind(KYSELY_DIALECT_FACTORY).toFactory(context => () => {
    const appConfig = context.get(APP_CONFIG);
    const poolProvider = context.get(PG_POOL_PROVIDER);
    return new PostgresDialect({
      pool: poolProvider(),
      onCreateConnection: async connection => {
        await initPersistence(connection, appConfig.persistence.schema);
      },
    });
  });
  bind(DB_FACTORY).toFactory(context => <T>() => {
    const kyselyDialectFactory = context.get(KYSELY_DIALECT_FACTORY);
    const pgDialect = kyselyDialectFactory();
    const logFactory = context.get(LOGGER_FACTORY);
    const logger = logFactory(PERSISTENCE_KYSELY_LOGGER_NAME);
    return new Kysely<T>({
      dialect: pgDialect,
      log: event => {
        if (event.level === 'query') {
          logger.debug('Kysely query.', {
            query: event.query.sql,
            parameters: event.query.parameters,
          });
          logger.silly('Kysely query details:', {
            query: event.query,
            duration: `${event.queryDurationMillis}ms`,
          });
        } else if (event.level === 'error') {
          logger.error('Kysely query error', {
            error: event.error,
            query: event.query,
            durationMillis: `${event.queryDurationMillis}ms`,
          });
        }
      },
      plugins: [new CamelCasePlugin()],
    });
  });
  bind(FleetSightDatasource).toDynamicValue(context =>
    registerDataSource(() => {
      const dbFactory = context.get(DB_FACTORY);
      return dbFactory();
    }),
  );
});
