import { ContainerModule } from 'inversify';
import { TrucksController } from './trucks/trucks.controller';
import { TrucksMapper } from './trucks/trucks.mapper';

export { CONSOLE_REST_APPLICATION } from './console-api.application';

export const ConsoleControllers = [TrucksController];

export const ConsoleRestModule = new ContainerModule(({ bind }) => {
  bind(TrucksMapper).toSelf();
});
