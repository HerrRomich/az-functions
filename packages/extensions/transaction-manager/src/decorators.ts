import { DEFAULT_DATA_SOURCE_NAME, TransactionManagerError } from './transaction-manager.model';
import { transactionManagers } from './transaction-manager.module';
import { getTransactionalMethod } from './transactional-methods';
import { callMandatory, callNested, callNever, callNotSupported, callRequired } from './wrapper-methods';

export const TRANSACTIONAL_METADATA_KEY = Symbol.for('TransactionalManager.metadata');

/**
 * Defines how a decorated method participates in an existing transaction.
 *
 * - `required`: join the current transaction or create one when none exists.
 * - `requires_new`: always create a new transaction.
 * - `mandatory`: require an active transaction.
 * - `never`: reject execution when an active transaction exists.
 * - `supports`: use the current transaction when available, otherwise execute without one.
 * - `not_supported`: suspend the current transaction and execute without one.
 * - `nested`: create a savepoint in the current transaction, or a new transaction when none exists.
 */
export type Propagation = 'required' | 'requires_new' | 'mandatory' | 'never' | 'supports' | 'not_supported' | 'nested';

/**
 * Defines the database isolation level for a newly created transaction.
 *
 * `read_commited` and `read_uncommited` retain the spelling used by this public API
 * and map to the corresponding SQL isolation levels internally.
 */
export type Isolation = 'default' | 'read_commited' | 'read_uncommited' | 'repeatable_read' | 'serializable';

/** Options used by the {@link Transactional} decorator. */
export interface TransactionalConfig {
  /** Registered data-source name. Defaults to the default data source. */
  name?: string | symbol;
  /** Transaction propagation mode. Defaults to `required`. */
  propagation?: Propagation;
  /** Transaction isolation level. Defaults to `default`. */
  isolation?: Isolation;
}

/**
 * Declares transaction handling for a class or method.
 *
 * When applied to a class, the configuration becomes the default for its
 * transactional methods. Method-level configuration overrides class-level
 * configuration. Decorated methods use the registered data source selected by
 * {@link TransactionalConfig.name} and automatically commit or roll back a
 * transaction according to the method result.
 *
 * @param config Optional transaction configuration.
 * @returns A class or method decorator.
 *
 * @example
 * ```ts
 * @Transactional({ name: 'orders', propagation: 'required' })
 * class OrderService {
 *   @Transactional({ isolation: 'serializable' })
 *   async createOrder(order: NewOrder) {
 *     // Database calls use the active Kysely transaction.
 *   }
 * }
 * ```
 */
export function Transactional(config?: TransactionalConfig): ClassDecorator & MethodDecorator {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  return (target: object | Function, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    if (descriptor && typeof target === 'object') {
      transactionalMethod(config, target, descriptor);
    } else if (typeof target === 'function') {
      transactionalClass(config, target);
    }
  };
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
function transactionalClass(config: TransactionalConfig | undefined, target: Function) {
  Reflect.defineMetadata(TRANSACTIONAL_METADATA_KEY, config, target);
}

function transactionalMethod(config: TransactionalConfig | undefined, target: object, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value!;
  descriptor.value = async function newMethod(...args: unknown[]): Promise<unknown> {
    const classMetadata = Reflect.getMetadata(TRANSACTIONAL_METADATA_KEY, target.constructor);
    config = { ...classMetadata, ...config };
    const transactionManagerName = config?.name ?? DEFAULT_DATA_SOURCE_NAME;
    const propagation = config?.propagation ?? 'required';
    const transactionManager = transactionManagers[transactionManagerName];
    if (transactionManager === undefined) {
      throw new TransactionManagerError(
        'Transaction manager was not properly initialized. You should call initializeTransactionManager.',
      );
    }
    if (propagation === 'required') {
      return await callRequired(transactionManager, originalMethod, this, args);
    } else if (propagation === 'requires_new') {
      return await getTransactionalMethod(transactionManager, originalMethod, this)(args);
    } else if (propagation === 'mandatory') {
      return await callMandatory(transactionManager, originalMethod, this, args);
    } else if (propagation === 'never') {
      return await callNever(transactionManager, originalMethod, this, args);
    } else if (propagation === 'not_supported') {
      return await callNotSupported(transactionManager, originalMethod, this, args);
    } else if (propagation === 'nested') {
      return await callNested(transactionManager, originalMethod, this, args);
    } else {
      return await originalMethod.apply(this, args);
    }
  };
}
