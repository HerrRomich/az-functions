import { InvocationContext } from '@azure/functions';
import { AsyncLocalStorage } from 'async_hooks';
import { injectable } from 'inversify';
import { PlatformContext } from './platform.model';
import { UserAccount } from './security.model';

@injectable()
export class PlatformContextLocalStorage extends AsyncLocalStorage<PlatformContext> implements PlatformContext {
  get invocationContext(): InvocationContext | undefined {
    return this.getStore()?.invocationContext;
  }

  get userAccount(): UserAccount | undefined {
    return this.getStore()?.userAccount;
  }
}
