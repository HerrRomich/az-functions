import { ContainerModule } from 'inversify';
import { CustomersController } from './customers/customers.controller';
import { CustomersMapper } from './customers/customers.mapper';
import { OrdersController } from './orders/orders.controller';
import { OrdersMapper } from './orders/orders.mapper';

export { ORDERS_REST_APPLICATION } from './orders-api.application';

export const OrdersControllers = [OrdersController, CustomersController];

export const OrdersRestModule = new ContainerModule(({ bind }) => {
  bind(OrdersMapper).toSelf();
  bind(CustomersMapper).toSelf();
});
