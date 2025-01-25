import { inject, injectable } from 'inversify';
import { SYSTEM_USER_ACCOUNT, UserAccount } from 'shared';
import { PlatformContextLocalStorage } from '../shared/platform-context-local-storage';

@injectable()
export class SecurityContext {
  constructor(
    private readonly contextStorage: PlatformContextLocalStorage,
    @inject(SYSTEM_USER_ACCOUNT) private readonly systemUserAccount: UserAccount
  ) {}

  getAuthentication(): UserAccount {
    return this.contextStorage.getStore()?.userAccount ?? this.systemUserAccount;
  }
}
