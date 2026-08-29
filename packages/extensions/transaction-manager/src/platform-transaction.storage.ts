import { ControlledTransaction } from 'kysely';
import { AsyncLocalStorage } from 'node:async_hooks';

interface PlatformTransaction<DB> {
  transaction?: ControlledTransaction<DB, string[]>;
}

export class PlatformTransactionLocalStorage<DB>
  extends AsyncLocalStorage<PlatformTransaction<DB>>
  implements PlatformTransaction<DB>
{
  get transaction(): ControlledTransaction<DB, string[]> | undefined {
    return this.getStore()?.transaction;
  }
}
