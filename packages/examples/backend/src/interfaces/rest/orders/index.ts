import { ContainerModule } from 'inversify';
import { CustomersMapper } from './customers.mapper';
import { OrdersMapper } from './orders.mapper';

export { CustomersController } from './customers.controller';
export { ORDERS_REST_APPLICATION } from './orders-api.application';
export { OrdersController } from './orders.controller';

export const OrdersRestModule = new ContainerModule(({ bind }) => {
  bind(OrdersMapper).toSelf();
  bind(CustomersMapper).toSelf();
});
