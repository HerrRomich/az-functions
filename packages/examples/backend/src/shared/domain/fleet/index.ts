import { ContainerModule } from 'inversify';
import { TrucksRepository } from './truck.repository';

export { TrucksRepository, TruckWithDriver } from './truck.repository';

export const ApplicationFleetModule = new ContainerModule(({ bind }) => {
  bind(TrucksRepository).toSelf();
});
