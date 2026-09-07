import { RestApplication, TriggerHandlerClass } from '@herrromich/az-functions';
import { CONSOLE_REST_APPLICATION, ConsoleControllers } from './console';
import { EVENT_HUB_REST_APPLICATION, EventHubControllers } from './event-hub/index';
import { LOGGING_REST_APPLICATION, LoggingControllers } from './logging';
import { ORDERS_REST_APPLICATION, OrdersControllers } from './orders';

export { ConsoleRestModule } from './console';
export { OrdersRestModule } from './orders';

export const HttpControllers: TriggerHandlerClass[] = [
  ...ConsoleControllers,
  ...OrdersControllers,
  ...LoggingControllers,
  ...EventHubControllers,
];
export const RestApplications: RestApplication[] = [
  CONSOLE_REST_APPLICATION,
  ORDERS_REST_APPLICATION,
  LOGGING_REST_APPLICATION,
  EVENT_HUB_REST_APPLICATION,
];
