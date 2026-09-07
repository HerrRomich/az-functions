import { Transactional } from '@herrromich/transaction-manager';
import { Point } from 'geojson';
import { injectable } from 'inversify';
import { Selectable } from 'kysely';
import { FleetSightDatasource } from '../../persistence';
import { TruckTable } from '../../persistence/features/fleet';

export type TruckWithDriver = Selectable<TruckTable> & {
  destinationAddress: string | null;
  destinationPoint: Point | null;
  driverId: string | null;
  driverName: string | null;
  driverSurname: string | null;
};

@injectable()
export class TrucksRepository {
  constructor(private readonly db: FleetSightDatasource) {}

  @Transactional()
  async getAllTrucksWithDrivers(): Promise<TruckWithDriver[]> {
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

  @Transactional()
  async getTruckById(truckId: string): Promise<TruckWithDriver | undefined> {
    return await this.getTrucksWithDriversQuery().where('truck.id', '=', truckId).executeTakeFirst();
  }

  @Transactional()
  async deleteTruckById(truckId: string): Promise<void> {
    await this.db.deleteFrom('truck').where('id', '=', truckId).executeTakeFirstOrThrow();
  }
}
