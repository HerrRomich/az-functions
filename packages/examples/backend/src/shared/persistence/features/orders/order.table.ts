import { Point } from 'geojson';
import { Generated } from 'kysely';

export interface OrderTable {
  id: Generated<string>;
  customerId: string;
  createdAt: Date;
  sourceAddress: string;
  sourcePoint: Point;
  destinationAddress: string;
  destinationPoint: Point;
  weight: number;
  volume: number;
  scheduledAt: Date | null;
  status: 'scheduled' | 'in_transit' | 'loaded' | 'delivered';
  truckRunId: string | null;
}
