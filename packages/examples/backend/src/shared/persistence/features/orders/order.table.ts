import { Point } from 'geojson';
import { Generated } from 'kysely';

export interface OrderTable {
  id: Generated<number>;
  customerId: number;
  sourceAddress: string;
  sourcePoint: Point;
  destinationAddress: string;
  destinationPoint: Point;
}
