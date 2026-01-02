import { TransactionManager, TransactionManagerError } from './transaction-manager.module';
import {
  getNestedTransactionalMethod,
  getNonTransactionalMethod,
  getTransactionalMethod,
} from './transactional-methods';

export async function callRequired(
  transactionManager: TransactionManager,
  originalMethod: (...args: unknown[]) => unknown,
  thisArg: unknown,
  args: unknown[],
): Promise<unknown> {
  const transaction = transactionManager.storage.transaction;
  if (transaction === undefined) {
    return await getTransactionalMethod(transactionManager, originalMethod, thisArg)(...args);
  } else {
    return await originalMethod.apply(thisArg, args);
  }
}

export async function callMandatory(
  transactionManager: TransactionManager,
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  originalMethod: Function,
  thisArg: unknown,
  args: unknown[],
): Promise<unknown> {
  if (transactionManager.storage.transaction === undefined) {
    throw new TransactionManagerError('No transaction found for propagation=mandatory');
  } else {
    return originalMethod.apply(thisArg, args);
  }
}

export async function callNever(
  transactionManager: TransactionManager,
  originalMethod: (...args: unknown[]) => unknown,
  thisArg: unknown,
  args: unknown[],
): Promise<unknown> {
  if (transactionManager.storage.transaction === undefined) {
    return originalMethod.apply(thisArg, args);
  } else {
    throw new TransactionManagerError('Transaction is found for propagation=never');
  }
}

export async function callNotSupported(
  transactionManager: TransactionManager,
  originalMethod: (...args: unknown[]) => unknown,
  thisArg: unknown,
  args: unknown[],
): Promise<unknown> {
  const { storage } = transactionManager;
  const transaction = storage.transaction;
  if (transaction === undefined) {
    return originalMethod.apply(thisArg, args);
  } else {
    return getNonTransactionalMethod(storage, originalMethod, thisArg)(...args);
  }
}

export async function callNested(
  transactionManager: TransactionManager,
  originalMethod: (...args: unknown[]) => unknown,
  thisArg: unknown,
  args: unknown[],
): Promise<unknown> {
  const storage = transactionManager.storage;
  const transaction = storage.transaction;
  if (transaction === undefined) {
    return getTransactionalMethod(transactionManager, originalMethod, thisArg)(...args);
  } else {
    return getNestedTransactionalMethod(transaction, storage, originalMethod, thisArg)(...args);
  }
}
