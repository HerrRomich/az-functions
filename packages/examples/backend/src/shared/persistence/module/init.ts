import { CompiledQuery, DatabaseConnection, QueryResult } from 'kysely';
import { types } from 'pg';
import * as wkx from 'wkx';

export async function initPersistence(connection: DatabaseConnection, persistenceSchema: string) {
  await connection.executeQuery(CompiledQuery.raw(`SET search_path TO '${persistenceSchema}';`));
  const pgTypes: QueryResult<{ oid: number; typname: string }> = await connection.executeQuery(
    CompiledQuery.raw("SELECT oid, typname from pg_type WHERE typname in ('geometry')"),
  );
  const geometryType = pgTypes.rows.find(type => type.typname === 'geometry');
  if (geometryType) {
    types.setTypeParser(geometryType.oid, val => wkx.Geometry.parse(Buffer.from(val, 'hex')).toGeoJSON());
  }
  types.setTypeParser(types.builtins.NUMERIC, val => parseFloat(val));
  types.setTypeParser(types.builtins.INT8, val => parseInt(val, 10));
}
