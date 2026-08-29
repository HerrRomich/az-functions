import { TruckWithDriver } from '@fleet-sight/shared/applications/fleet';
import { pointToGeoJsonPoint } from '@fleet-sight/shared/persistence';
import { injectable } from 'inversify';
import { TruckDto, TruckStatus } from './trucks.dto';

@injectable()
export class TrucksMapper {
  toDto(truck: TruckWithDriver): TruckDto {
    const status: TruckStatus = truck.runId === null ? 'idle' : 'en_route';
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
      destinationPoint: pointToGeoJsonPoint(truck.destinationPoint),
      driver,
      status,
      runId: truck.runId ?? undefined,
    };
  }
}
