import { Kysely } from 'kysely';
import { PlatformTransactionLocalStorage } from './platform-transaction.storage';

export const DEFAULT_DATA_SOURCE_NAME = Symbol.for('TransactionManager.DefaultDataSource');

export interface TransactionManager<DB> {
  kysely: Kysely<DB>;
  storage: PlatformTransactionLocalStorage<DB>;
}

export class TransactionManagerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransactionManagerError';
    Object.setPrototypeOf(this, TransactionManagerError.prototype);
  }
}

export class DataSource<DB> extends Kysely<DB> {}
