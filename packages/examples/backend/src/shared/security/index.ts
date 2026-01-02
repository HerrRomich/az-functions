import { SYSTEM_USER_ACCOUNT } from '@herrromich/az-functions';
import { ContainerModule } from 'inversify';

export const securityModule = new ContainerModule(({ bind }) => {
  bind(SYSTEM_USER_ACCOUNT).toConstantValue({
    isAdmin: true,
    permissions: [],
  });
});
