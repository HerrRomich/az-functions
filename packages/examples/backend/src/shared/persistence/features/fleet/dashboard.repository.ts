import { DataSource } from '@herrromich/transaction-manager';
import { injectable } from 'inversify';
import { ElementOfPromiseArray } from 'shared/utils';
import { IFleetSightDatabase } from '../../database';

export type TruckWithDriver = ElementOfPromiseArray<ReturnType<DashboardRepository['getAllTrucksWithDrivers']>>;

@injectable()
export class DashboardRepository {
  constructor(private readonly db: DataSource<IFleetSightDatabase>) {}

  async getAllTrucksWithDrivers() {
    return await this.getTrucksWithDriversQuery().execute();
  }

  private getTrucksWithDriversQuery() {
    return this.db
      .selectFrom('truck')
      .leftJoin('truckRun', 'truck.id', 'truckRun.truckId')
      .leftJoin('driver', 'truckRun.driverId', 'driver.id')
      .selectAll('truck')
      .select([
        'truckRun.destinationAddress',
        'truckRun.destinationPoint',
        'truckRun.driverId as driverId',
        'driver.name as driverName',
        'driver.surname as driverSurname',
      ]);
  }

  async getTruckById(truckId: number) {
    return await this.getTrucksWithDriversQuery().where('truck.id', '=', truckId).executeTakeFirst();
  }
}
