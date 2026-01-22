import { DriverTable, TruckRunTable, TruckTable } from './features/fleet';
import { CustomerTable, OrderTable } from './features/orders';

export interface IFleetSightDatabase {
  // fleet management
  truck: TruckTable;
  driver: DriverTable;
  truckRun: TruckRunTable;

  // orders management
  order: OrderTable;
  customer: CustomerTable;
}
