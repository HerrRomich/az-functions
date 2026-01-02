import { Geometry } from 'geojson';
import { sql } from 'kysely';

export function stContains(geomA: Geometry, geomB: Geometry) {
  return sql<boolean>`ST_Contains(${geomA}, ${geomB})`;
}
