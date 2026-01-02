import { DriverTable } from './features/fleet/driver.table';
import { TruckRunTable } from './features/fleet/truck-run.table';
import { TruckTable } from './features/fleet/truck.table';
import { CustomerTable } from './features/orders/customer.table';
import { OrderTable } from './features/orders/order.table';

export const DB = Symbol.for('DB');

export interface IFleetSightDatabase {
  // fleet management
  truck: TruckTable;
  driver: DriverTable;
  truckRun: TruckRunTable;

  // orders management
  order: OrderTable;
  customer: CustomerTable;
}
