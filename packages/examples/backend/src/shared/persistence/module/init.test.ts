import { mock } from 'jest-mock-extended';
import { CompiledQuery, DatabaseConnection } from 'kysely';
import * as pg from 'pg';
import { types } from 'pg';
import { initPersistence } from './init';

jest.mock('pg', () => {
  const requireActual = jest.requireActual('pg');
  return {
    ...requireActual,
    types: {
      ...requireActual.types,
      setTypeParser: jest.fn(),
    },
  };
});
jest.mock('kysely', () => ({
  ...jest.requireActual('kysely'),
  CompiledQuery: { raw: jest.fn() },
}));

describe('initPersistence', () => {
  it('should set type parsers on pg types', async () => {
    const mockConnection = mock<DatabaseConnection>();
    const mockPgTypesCompiledQuery = mock<CompiledQuery>();
    jest.mocked(CompiledQuery.raw).mockImplementation((sql, _params) => {
      if (sql.includes("SELECT oid, typname from pg_type WHERE typname in ('geometry')")) {
        return mockPgTypesCompiledQuery;
      } else {
        return { sql, parameters: _params } as any;
      }
    });
    mockConnection.executeQuery.calledWith(mockPgTypesCompiledQuery).mockResolvedValue({
      rows: [{ oid: 20134, typname: 'geometry' }],
    });

    await initPersistence(mockConnection, 'test-schema');

    expect(CompiledQuery.raw).toHaveBeenCalledWith("SET search_path TO 'test-schema';");
    expect(CompiledQuery.raw).toHaveBeenCalledWith("SELECT oid, typname from pg_type WHERE typname in ('geometry')");
    expect(mockConnection.executeQuery).toHaveBeenCalledWith(mockPgTypesCompiledQuery);
    expect(pg.types.setTypeParser).toHaveBeenCalledWith(20134, expect.any(Function));
    expect(pg.types.setTypeParser).toHaveBeenCalledWith(types.builtins.INT8, expect.any(Function));
    expect(pg.types.setTypeParser).toHaveBeenCalledWith(types.builtins.NUMERIC, expect.any(Function));
  });
});
