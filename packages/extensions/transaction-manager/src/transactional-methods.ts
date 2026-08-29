import { ControlledTransaction, IsolationLevel } from 'kysely';
import { v4 } from 'uuid';
import { Isolation, TransactionalConfig } from './decorators';
import { PlatformTransactionLocalStorage } from './platform-transaction.storage';
import { TransactionManager } from './transaction-manager.model';

const isolationMap: Record<Exclude<Isolation, 'default'>, IsolationLevel> = {
  read_commited: 'read committed',
  read_uncommited: 'read uncommitted',
  repeatable_read: 'repeatable read',
  serializable: 'serializable',
};

export function getTransactionalMethod(
  transactionManager: TransactionManager<unknown>,
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  originalMethod: Function,
  thisArg: unknown,
  config?: TransactionalConfig,
): (...args: unknown[]) => Promise<unknown> {
  const isolation = config?.isolation ?? 'default';
  return async function (...args: unknown[]): Promise<unknown> {
    const { kysely, storage } = transactionManager;
    const transactionBuilder = kysely.startTransaction();
    if (isolation !== 'default') {
      transactionBuilder.setIsolationLevel(isolationMap[isolation]);
    }
    const transaction = await transactionBuilder.execute();
    try {
      const result = await storage.run({ transaction }, async () => {
        return await originalMethod.apply(thisArg, args);
      });
      await transaction.commit().execute();
      return result;
    } catch (error) {
      await transaction.rollback().execute();
      throw error;
    }
  };
}

export function getNonTransactionalMethod<DB>(
  platformTransactionStorage: PlatformTransactionLocalStorage<DB>,
  originalMethod: (...args: unknown[]) => unknown,
  thisArg: unknown,
): (...args: unknown[]) => Promise<unknown> {
  return async function (...args: unknown[]) {
    return platformTransactionStorage.run({}, () => originalMethod.apply(thisArg, args));
  };
}

export function getNestedTransactionalMethod<DB>(
  transaction: ControlledTransaction<DB>,
  platformTransactionStorage: PlatformTransactionLocalStorage<DB>,
  originalMethod: (...args: unknown[]) => unknown,
  thisArg: unknown,
): (...args: unknown[]) => Promise<unknown> {
  return async function (...args: unknown[]) {
    const savepointName: string = v4();

    const nestedTransaction = await transaction.savepoint(savepointName).execute();
    try {
      return await platformTransactionStorage.run({ transaction: nestedTransaction }, () =>
        originalMethod.apply(thisArg, args),
      );
    } catch (error) {
      await nestedTransaction.rollbackToSavepoint(savepointName).execute();
      throw error;
    } finally {
      await nestedTransaction.releaseSavepoint(savepointName).execute();
    }
  };
}
