import { mock } from 'jest-mock-extended';
import { transactional, TRANSACTIONAL_METADATA_KEY } from './decorators';
import { TransactionManager, TransactionManagerError, transactionManagers } from './transaction-manager.module';
import { getTransactionalMethod } from './transactional-methods';
import { callMandatory, callNested, callNever, callNotSupported, callRequired } from './wrapper-methods';

const testNestedMethod = jest.fn();

@transactional({
  name: 'test-transaction-manager',
  propagation: 'requires_new',
  isolation: 'read_uncommited',
})
class TestService {
  @transactional()
  async classDecoratedMethod(param: string): Promise<void> {
    await testNestedMethod('class-decorated-method', param);
  }

  @transactional({
    propagation: 'supports',
  })
  async supportsMethod(param: string): Promise<void> {
    await testNestedMethod('supports-method', param);
  }

  @transactional({
    propagation: 'not_supported',
  })
  async notSupportedMethod(param: string): Promise<void> {
    await testNestedMethod('not-supported-method', param);
  }

  @transactional({
    propagation: 'never',
  })
  async neverMethod(param: string): Promise<void> {
    await testNestedMethod('never-method', param);
  }

  @transactional({
    propagation: 'nested',
  })
  async nestedMethod(param: string): Promise<void> {
    await testNestedMethod('nested-method', param);
  }

  @transactional({
    propagation: 'mandatory',
    isolation: 'serializable',
  })
  async mandatoryMethod(param: string): Promise<void> {
    await testNestedMethod('mandatory-method', param);
  }

  @transactional({
    propagation: 'required',
  })
  async requiredMethod(param: string): Promise<void> {
    await testNestedMethod('required-method', param);
  }

  @transactional({
    name: 'unknown-transaction-manager',
  })
  async unknownTransactionManagerMethod(param: string): Promise<void> {
    await testNestedMethod('unknown-transaction-manager-method', param);
  }
}

jest.mock('./transaction-manager.module', () => {
  const actualModule = jest.requireActual('./transaction-manager.module');
  return {
    ...actualModule,
    transactionManagers: {
      [Symbol.for('DEFAULT_DATA_SOURCE')]: mock<TransactionManager>(),
      'test-transaction-manager': mock<TransactionManager>(),
    },
  };
});
jest.mock('./transactional-methods');
jest.mock('./wrapper-methods');

describe('decorators', () => {
  it('should provide transactional metadata for class', () => {
    expect(Reflect.getMetadata(TRANSACTIONAL_METADATA_KEY, TestService)).toEqual({
      name: 'test-transaction-manager',
      propagation: 'requires_new',
      isolation: 'read_uncommited',
    });
  });

  describe('method execution', () => {
    let subject: TestService;

    beforeEach(() => {
      subject = new TestService();
    });

    it('should execute class-decorated method without errors', async () => {
      jest.mocked(getTransactionalMethod).mockReturnValue(jest.fn());

      await subject.classDecoratedMethod('test_data');

      expect(getTransactionalMethod).toHaveBeenCalledWith(
        transactionManagers['test-transaction-manager'],
        expect.any(Function),
        subject,
      );
      const originalMethod = jest.mocked(getTransactionalMethod).mock.calls[0]![1];
      await originalMethod('test_data');
      expect(testNestedMethod).toHaveBeenCalledWith('class-decorated-method', 'test_data');
    });

    it('should execute supports method without errors', async () => {
      await subject.supportsMethod('test_data');

      expect(testNestedMethod).toHaveBeenCalledWith('supports-method', 'test_data');
    });

    it('should execute notSupported method without errors', async () => {
      await subject.notSupportedMethod('test_data');

      expect(callNotSupported).toHaveBeenCalledWith(
        transactionManagers['test-transaction-manager'],
        expect.any(Function),
        subject,
        ['test_data'],
      );
      const originalMethod = jest.mocked(callNotSupported).mock.calls[0]![1];
      await originalMethod('test_data');
      expect(testNestedMethod).toHaveBeenCalledWith('not-supported-method', 'test_data');
    });

    it('should execute never method without errors', async () => {
      await subject.neverMethod('test_data');

      expect(callNever).toHaveBeenCalledWith(
        transactionManagers['test-transaction-manager'],
        expect.any(Function),
        subject,
        ['test_data'],
      );

      const originalMethod = jest.mocked(callNever).mock.calls[0]![1];
      await originalMethod('test_data');
      expect(testNestedMethod).toHaveBeenCalledWith('never-method', 'test_data');
    });

    it('should execute nested method without errors', async () => {
      await subject.nestedMethod('test_data');

      expect(callNested).toHaveBeenCalledWith(
        transactionManagers['test-transaction-manager'],
        expect.any(Function),
        subject,
        ['test_data'],
      );
      const originalMethod = jest.mocked(callNested).mock.calls[0]![1];
      await originalMethod('test_data');
      expect(testNestedMethod).toHaveBeenCalledWith('nested-method', 'test_data');
    });

    it('should execute mandatory method without errors', async () => {
      await subject.mandatoryMethod('test_data');

      expect(callMandatory).toHaveBeenCalledWith(
        transactionManagers['test-transaction-manager'],
        expect.any(Function),
        subject,
        ['test_data'],
      );
      const originalMethod = jest.mocked(callMandatory).mock.calls[0]![1];
      await originalMethod('test_data');
      expect(testNestedMethod).toHaveBeenCalledWith('mandatory-method', 'test_data');
    });

    it('should execute required method without errors', async () => {
      await subject.requiredMethod('test_data');

      expect(callRequired).toHaveBeenCalledWith(
        transactionManagers['test-transaction-manager'],
        expect.any(Function),
        subject,
        ['test_data'],
      );
      const originalMethod = jest.mocked(callRequired).mock.calls[0]![1];
      await originalMethod('test_data');
      expect(testNestedMethod).toHaveBeenCalledWith('required-method', 'test_data');
    });

    it('should throw error for unknown transaction manager', async () => {
      await expect(subject.unknownTransactionManagerMethod('test_data')).rejects.toThrowWithMessage(
        TransactionManagerError,
        'Transaction manager was not properly initialized. You should call initializeTransactionManager.',
      );
    });
  });
});
