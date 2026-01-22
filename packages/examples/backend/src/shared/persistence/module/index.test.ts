import { Logger, LOGGER_FACTORY } from '@herrromich/az-functions';
import { DataSource, registerDataSource } from '@herrromich/transaction-manager';
import { getPartialFixture } from '@utilities/test-utilities';
import { Container } from 'inversify';
import { mock, MockProxy } from 'jest-mock-extended';
import {
  CamelCasePlugin,
  CompiledQuery,
  DatabaseConnection,
  Kysely,
  KyselyConfig,
  Logger as KyselyLogger,
  PostgresDialect,
} from 'kysely';
import { Pool } from 'pg';
import { APP_CONFIG } from '../../app-config';
import { DB_FACTORY, IFleetSightDatabase, KYSELY_DIALECT_FACTORY, PersistenceModule, PG_POOL_PROVIDER } from './index';
import { initPersistence } from './init';

jest.mock('pg', () => ({
  ...jest.requireActual('pg'),
  Pool: jest.fn(),
}));
jest.mock('@herrromich/transaction-manager', () => {
  const originalModule = jest.requireActual('@herrromich/transaction-manager');
  return {
    ...originalModule,
    registerDataSource: jest.fn(),
  };
});
jest.mock('kysely', () => ({
  ...jest.requireActual('kysely'),
  Kysely: jest.fn(),
  PostgresDialect: jest.fn(),
  CamelCasePlugin: jest.fn(),
  CompiledQuery: { raw: jest.fn() },
}));
jest.mock('./init', () => ({
  initPersistence: jest.fn(),
}));

describe('PersistenceModule', () => {
  let mockLogger: MockProxy<Logger>;
  let container: Container;

  beforeEach(() => {
    container = new Container({ defaultScope: 'Singleton' });
    container.bind(APP_CONFIG).toConstantValue({
      persistence: {
        connectionString: 'test-connection-string',
        secureConnection: true,
        schema: 'test-schema',
      },
    });
    container.loadSync(PersistenceModule);

    mockLogger = mock<Logger>();
    container.bind(LOGGER_FACTORY).toFactory(() => () => mockLogger);
  });

  it('should configure pg Pool with correct parameters', () => {
    const mockPool = mock<Pool>();
    jest.mocked(Pool).mockReturnValue(mockPool);

    const poolProvider = container.get(PG_POOL_PROVIDER);
    const pool = poolProvider();

    expect(Pool).toHaveBeenCalledWith({
      connectionString: 'test-connection-string',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      ssl: true,
    });
    expect(pool).toBe(mockPool);
  });

  it('should provide Postgrees Dialect with correct search_path onCreateConnection', async () => {
    const mockPostgresDialect = mock<PostgresDialect>();
    jest.mocked(PostgresDialect).mockReturnValue(mockPostgresDialect);
    const mockPool = mock<Pool>();
    container.rebindSync(PG_POOL_PROVIDER).toFactory(() => () => {
      return mockPool;
    });

    const dbFactory = container.get(KYSELY_DIALECT_FACTORY);
    const dialect = dbFactory();

    expect(PostgresDialect).toHaveBeenCalledWith({
      pool: mockPool,
      onCreateConnection: expect.any(Function),
    });
    expect(dialect).toBe(mockPostgresDialect);

    const mockConnection = mock<DatabaseConnection>();
    const onCreateConnection = jest.mocked(PostgresDialect).mock.calls[0]![0].onCreateConnection!;
    expect(initPersistence).not.toHaveBeenCalled();
    await onCreateConnection(mockConnection);
    expect(initPersistence).toHaveBeenCalledWith(mockConnection, 'test-schema');
  });

  it('should provide Kysely instance', async () => {
    const mockPostgresDialect = mock<PostgresDialect>();
    container.rebindSync(KYSELY_DIALECT_FACTORY).toFactory(() => () => mockPostgresDialect);
    const mockPlugin = mock<CamelCasePlugin>();
    jest.mocked(CamelCasePlugin).mockReturnValue(mockPlugin);
    const mockKysely = mock<Kysely<unknown>>();
    jest.mocked(Kysely).mockReturnValue(mockKysely);

    const dbFactory = container.get(DB_FACTORY);
    const database = dbFactory();

    expect(CamelCasePlugin).toHaveBeenCalled();
    expect(Kysely).toHaveBeenCalledWith({
      dialect: mockPostgresDialect,
      plugins: [mockPlugin],
      log: expect.any(Function),
    });
    expect(database).toBe(mockKysely);

    const logFunction = (jest.mocked(Kysely).mock.calls[0]![0] as KyselyConfig).log! as KyselyLogger;
    await logFunction({
      level: 'query',
      query: getPartialFixture<CompiledQuery>({ sql: 'SELECT 1', parameters: [] }),
      queryDurationMillis: 10,
    });
    expect(mockLogger.debug).toHaveBeenCalledWith('Kysely Query:', {
      query: 'SELECT 1',
      parameters: [],
      durationMillis: 10,
    });
    await logFunction({
      level: 'error',
      error: new Error('Test error'),
      query: getPartialFixture<CompiledQuery>({ sql: 'SELECT 1', parameters: [] }),
      queryDurationMillis: 10,
    });
    expect(mockLogger.error).toHaveBeenCalledWith('Kysely Query Error', {
      error: new Error('Test error'),
      query: 'SELECT 1',
      parameters: [],
      durationMillis: 10,
    });
  });

  it('should register DataSource with Kysely factory', () => {
    const mockKysely = mock<Kysely<IFleetSightDatabase>>();
    container.rebindSync(DB_FACTORY).toFactory(() => () => mockKysely);
    const mockDataSource = mock<DataSource<unknown>>();
    jest.mocked(registerDataSource).mockReturnValueOnce(mockDataSource);

    const dataSource = container.get<DataSource<unknown>>(DataSource);

    expect(registerDataSource).toHaveBeenCalledWith(expect.any(Function));
    expect(dataSource).toBe(mockDataSource);

    const dataSourceFactory = jest.mocked(registerDataSource).mock.calls[0]![0];
    const resultKysely = dataSourceFactory();
    expect(resultKysely).toBe(mockKysely);
  });
});
