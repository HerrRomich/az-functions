import { Generated } from 'kysely';
import { GeoJSON2DPoint } from 'zod-geojson';

export interface TruckRunTable {
  id: Generated<string>;
  truckId: string;
  driverId: string;
  destinationAddress: string;
  destinationPoint: GeoJSON2DPoint;
  type: 'home' | 'delivery' | 'pickup' | 'maintenance';
  orderId: string | null;
}
