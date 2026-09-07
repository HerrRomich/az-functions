import { ContainerModule } from 'inversify';
import { CustomerUsersService } from './customer-users.service';

export { CustomerUsersService } from './customer-users.service';

export const ApplicationCustomersModule = new ContainerModule(({ bind }) => {
  bind(CustomerUsersService).toSelf();
});
