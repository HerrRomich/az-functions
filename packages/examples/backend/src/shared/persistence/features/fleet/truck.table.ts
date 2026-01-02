import { Generated } from 'kysely';
import { GeoJSON2DPoint } from 'zod-geojson';

export interface TruckTable {
  id: Generated<number>;
  licensePlate: string;
  model: string;
  location: GeoJSON2DPoint;
  speed: number;
  acceleration: number;
  fuelLevel: number;
  run: number | null;
}
