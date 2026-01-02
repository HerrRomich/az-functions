import { injectable } from 'inversify';
import { TruckWithDriver } from 'shared/persistence/features/fleet/dashboard.repository';
import { TruckDto, TruckStatus } from './dashboard.dto';

@injectable()
export class DashboardMapper {
  toDto(truck: TruckWithDriver): TruckDto {
    const status: TruckStatus = truck.run === null ? 'idle' : 'en_route';
    const driver: TruckDto['driver'] =
      truck.driverId !== null
        ? {
            id: truck.driverId,
            name: `${truck.driverName ?? ''} ${truck.driverSurname ?? ''}`.trim(),
          }
        : undefined;
    return {
      id: truck.id,
      licensePlate: truck.licensePlate,
      model: truck.model,
      location: truck.location,
      speed: truck.speed,
      acceleration: truck.acceleration,
      fuelLevel: truck.fuelLevel,
      destinationAddress: truck.destinationAddress ?? undefined,
      destinationPoint: truck.destinationPoint ?? undefined,
      driver,
      status,
    };
  }
}
