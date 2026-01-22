/* eslint-disable @typescript-eslint/no-explicit-any */
import { Kysely } from 'kysely';
import { PlatformTransactionLocalStorage } from './platform-transaction.storage';
import {
  DataSource,
  DEFAULT_DATA_SOURCE_NAME,
  TransactionManager,
  TransactionManagerError,
} from './transaction-manager.model';

const _transactionManagers: Record<string | symbol, TransactionManager<any>> = {};
export const transactionManagers: Readonly<Record<string | symbol, Readonly<TransactionManager<unknown>>>> =
  _transactionManagers;

export function registerDataSource<DB>(
  kyselyProvider: () => Kysely<DB>,
  dataSourceName?: string | symbol,
): DataSource<DB> {
  const name = dataSourceName ?? DEFAULT_DATA_SOURCE_NAME;
  if (_transactionManagers[name]) {
    throw new TransactionManagerError(`Data source with name '${String(name)}' is already registered.`);
  }
  const kysely = kyselyProvider();
  const storage = new PlatformTransactionLocalStorage<DB>();
  const dataSource: any = {};
  const protos = new Array<any>();
  let proto = Object.getPrototypeOf(kysely);
  while (Object.getPrototypeOf(proto) !== null) {
    protos.push(proto);
    proto = Object.getPrototypeOf(proto);
  }
  const allMembers = protos.flatMap(proto =>
    Object.getOwnPropertyNames(proto).map(propertyName => [proto, propertyName] as const),
  );
  for (const [proto, propertyName] of allMembers) {
    const desc = Object.getOwnPropertyDescriptor(proto, propertyName);
    const getter = desc?.get;
    const setter = desc?.set;
    if (typeof desc?.value === 'function' && propertyName !== 'constructor') {
      Object.defineProperty(dataSource, propertyName, {
        ...desc,
        value: (...args: any[]) => {
          const transaction = storage.transaction ?? kysely;
          return desc.value.apply(transaction, args);
        },
      });
    } else if (typeof getter === 'function' || typeof setter === 'function') {
      Object.defineProperty(dataSource, propertyName, {
        ...desc,
        get:
          getter === undefined
            ? undefined
            : () => {
                const transaction = storage.transaction ?? kysely;
                return getter.apply(transaction);
              },
        set:
          setter === undefined
            ? undefined
            : (val: any) => {
                const transaction = storage.transaction ?? kysely;
                setter.apply(transaction, [val]);
              },
      });
    }
  }

  _transactionManagers[name] = { kysely, storage };
  return dataSource as DataSource<DB>;
}

export function deleteTransactionManager(dataSourceName: string | symbol) {
  if (!_transactionManagers[dataSourceName]) {
    throw new TransactionManagerError(`Data source with name '${String(dataSourceName)}' is not registered.`);
  }
  delete _transactionManagers[dataSourceName];
}

export function resetTransactionManagers() {
  for (const key of Object.getOwnPropertyNames(_transactionManagers)) {
    delete _transactionManagers[key];
  }
  for (const key of Object.getOwnPropertySymbols(_transactionManagers)) {
    delete _transactionManagers[key];
  }
}
