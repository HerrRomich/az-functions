import { ContainerModule } from 'inversify';
import { TrucksMapper } from './trucks/trucks.mapper';

export { CONSOLE_REST_APPLICATION } from './console-api.application';
export { TrucksController } from './trucks/trucks.controller';

export const ConsoleRestModule = new ContainerModule(({ bind }) => {
  bind(TrucksMapper).toSelf();
});
