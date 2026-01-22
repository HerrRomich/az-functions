import { ContainerModule } from 'inversify';
import { CustomersRepository } from './customers.repository';
import { OrdersRepository } from './orders.repository';

export * from './customers.repository';
export * from './orders.repository';

export const ApplicationOrdersModule = new ContainerModule(({ bind }) => {
  bind(OrdersRepository).toSelf();
  bind(CustomersRepository).toSelf();
});
