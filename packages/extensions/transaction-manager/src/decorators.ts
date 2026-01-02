import { DEFAULT_DATA_SOURCE_NAME, TransactionManagerError, transactionManagers } from './transaction-manager.module';
import { getTransactionalMethod } from './transactional-methods';
import { callMandatory, callNested, callNever, callNotSupported, callRequired } from './wrapper-methods';

export const TRANSACTIONAL_METADATA_KEY = 'transactional';

export type Propagation = 'required' | 'requires_new' | 'mandatory' | 'never' | 'supports' | 'not_supported' | 'nested';
export type Isolation = 'default' | 'read_commited' | 'read_uncommited' | 'repeatable_read' | 'serializable';

export interface TransactionalConfig {
  name?: string | symbol;
  propagation?: Propagation;
  isolation?: Isolation;
}

export function transactional(config?: TransactionalConfig): ClassDecorator & MethodDecorator {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  return (target: object | Function, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
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
