import { ContainerModule } from 'inversify';
import * as path from 'node:path';
import { BASE_DIR } from './platform.model';
import { SYSTEM_USER_ACCOUNT, systemUserAccount } from './security.model';

export * from './decorators';
export * from './platform-context-local-storage';
export * from './platform.model';
export * from './security.model';

export const sharedModule = new ContainerModule(({ bind }) => {
  bind(BASE_DIR).toConstantValue(path.resolve(__dirname, '.'));
  bind(SYSTEM_USER_ACCOUNT).toConstantValue(systemUserAccount);
});
