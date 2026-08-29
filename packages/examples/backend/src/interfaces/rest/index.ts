import { RestApplication, TriggerHandlerClass } from '@herrromich/az-functions';
import { CONSOLE_REST_APPLICATION, TrucksController } from './console';
import { EVENT_HUB_REST_APPLICATION, EventHubController } from './event-hub/index';
import { LOGGING_REST_APPLICATION, LogLevelsController } from './logging';
import { CustomersController, ORDERS_REST_APPLICATION, OrdersController } from './orders';

export { ConsoleRestModule } from './console';
export { OrdersRestModule } from './orders';

export const HttpControllers: TriggerHandlerClass[] = [
  TrucksController,
  CustomersController,
  OrdersController,
  LogLevelsController,
  EventHubController,
];
export const RestApplications: RestApplication[] = [
  CONSOLE_REST_APPLICATION,
  ORDERS_REST_APPLICATION,
  LOGGING_REST_APPLICATION,
  EVENT_HUB_REST_APPLICATION,
];
