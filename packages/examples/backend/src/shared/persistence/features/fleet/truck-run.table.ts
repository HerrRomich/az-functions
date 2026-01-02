import { Generated } from 'kysely';
import { GeoJSON2DPoint } from 'zod-geojson';

export interface TruckRunTable {
  id: Generated<number>;
  truckId: number;
  driverId: number;
  destinationAddress: string;
  destinationPoint: GeoJSON2DPoint;
  type: 'home' | 'delivery' | 'pickup' | 'maintenance';
  orderId: number | null;
}
