import { mock, MockProxy } from 'jest-mock-extended';
import { Transactional, TRANSACTIONAL_METADATA_KEY } from './decorators';
import { DEFAULT_DATA_SOURCE_NAME, TransactionManager, TransactionManagerError } from './transaction-manager.model';
import { transactionManagers } from './transaction-manager.module';
import { getTransactionalMethod } from './transactional-methods';
import { callMandatory, callNested, callNever, callNotSupported, callRequired } from './wrapper-methods';

const testNestedMethod = jest.fn();

@Transactional({
  name: 'test-transaction-manager',
  propagation: 'requires_new',
  isolation: 'read_uncommited',
})
class TestService {
  @Transactional()
  async classDecoratedMethod(param: string): Promise<void> {
    await testNestedMethod('class-decorated-method', param);
  }

  @Transactional({
    propagation: 'supports',
  })
  async supportsMethod(param: string): Promise<void> {
    await testNestedMethod('supports-method', param);
  }

  @Transactional({
    propagation: 'not_supported',
  })
  async notSupportedMethod(param: string): Promise<void> {
    await testNestedMethod('not-supported-method', param);
  }

  @Transactional({
    propagation: 'never',
  })
  async neverMethod(param: string): Promise<void> {
    await testNestedMethod('never-method', param);
  }

  @Transactional({
    propagation: 'nested',
  })
  async nestedMethod(param: string): Promise<void> {
    await testNestedMethod('nested-method', param);
  }

  @Transactional({
    propagation: 'mandatory',
    isolation: 'serializable',
  })
  async mandatoryMethod(param: string): Promise<void> {
    await testNestedMethod('mandatory-method', param);
  }

  @Transactional({
    propagation: 'required',
  })
  async requiredMethod(param: string): Promise<void> {
    await testNestedMethod('required-method', param);
  }

  @Transactional({
    name: 'unknown-transaction-manager',
  })
  async unknownTransactionManagerMethod(param: string): Promise<void> {
    await testNestedMethod('unknown-transaction-manager-method', param);
  }
}

@Transactional()
class DefaultTestService {
  @Transactional()
  async classDecoratedMethod(param: string): Promise<void> {
    await testNestedMethod('class-decorated-method', param);
  }
}

jest.mock('./transaction-manager.module');
jest.mock('./transactional-methods');
jest.mock('./wrapper-methods');

describe('decorators', () => {
  let mockDefaultTransactionManager: MockProxy<TransactionManager<any>>;

  beforeEach(() => {
    mockDefaultTransactionManager = mock<TransactionManager<any>>();
    (transactionManagers as any)[DEFAULT_DATA_SOURCE_NAME] = mockDefaultTransactionManager;
  });

  it('should provide Transactional metadata for class', () => {
    expect(Reflect.getMetadata(TRANSACTIONAL_METADATA_KEY, TestService)).toEqual({
      name: 'test-transaction-manager',
      propagation: 'requires_new',
      isolation: 'read_uncommited',
    });
    expect(Reflect.getMetadata(TRANSACTIONAL_METADATA_KEY, DefaultTestService)).toBeUndefined();
  });

  describe('method execution', () => {
    let mockTestTransactionManager: MockProxy<TransactionManager<any>>;

    let subject: TestService;

    beforeEach(() => {
      mockTestTransactionManager = mock<TransactionManager<any>>();
      (transactionManagers as any)['test-transaction-manager'] = mockTestTransactionManager;
      subject = new TestService();
    });

    it('should execute class-decorated method without errors', async () => {
      jest.mocked(getTransactionalMethod).mockReturnValue(jest.fn());

      await subject.classDecoratedMethod('test_data');

      expect(getTransactionalMethod).toHaveBeenCalledWith(mockTestTransactionManager, expect.any(Function), subject);
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

      expect(callNotSupported).toHaveBeenCalledWith(mockTestTransactionManager, expect.any(Function), subject, [
        'test_data',
      ]);
      const originalMethod = jest.mocked(callNotSupported).mock.calls[0]![1];
      await originalMethod('test_data');
      expect(testNestedMethod).toHaveBeenCalledWith('not-supported-method', 'test_data');
    });

    it('should execute never method without errors', async () => {
      await subject.neverMethod('test_data');

      expect(callNever).toHaveBeenCalledWith(mockTestTransactionManager, expect.any(Function), subject, ['test_data']);

      const originalMethod = jest.mocked(callNever).mock.calls[0]![1];
      await originalMethod('test_data');
      expect(testNestedMethod).toHaveBeenCalledWith('never-method', 'test_data');
    });

    it('should execute nested method without errors', async () => {
      await subject.nestedMethod('test_data');

      expect(callNested).toHaveBeenCalledWith(mockTestTransactionManager, expect.any(Function), subject, ['test_data']);
      const originalMethod = jest.mocked(callNested).mock.calls[0]![1];
      await originalMethod('test_data');
      expect(testNestedMethod).toHaveBeenCalledWith('nested-method', 'test_data');
    });

    it('should execute mandatory method without errors', async () => {
      await subject.mandatoryMethod('test_data');

      expect(callMandatory).toHaveBeenCalledWith(mockTestTransactionManager, expect.any(Function), subject, [
        'test_data',
      ]);
      const originalMethod = jest.mocked(callMandatory).mock.calls[0]![1];
      await originalMethod('test_data');
      expect(testNestedMethod).toHaveBeenCalledWith('mandatory-method', 'test_data');
    });

    it('should execute required method without errors', async () => {
      await subject.requiredMethod('test_data');

      expect(callRequired).toHaveBeenCalledWith(mockTestTransactionManager, expect.any(Function), subject, [
        'test_data',
      ]);
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

  describe('default transaction manager', () => {
    let subject: DefaultTestService;

    beforeEach(() => {
      subject = new DefaultTestService();
    });

    it('should execute class-decorated method without errors using default transaction manager', async () => {
      jest.mocked(getTransactionalMethod).mockReturnValue(jest.fn());

      await subject.classDecoratedMethod('test_data');

      expect(callRequired).toHaveBeenCalledWith(mockDefaultTransactionManager, expect.any(Function), subject, [
        'test_data',
      ]);
      const originalMethod = jest.mocked(callRequired).mock.calls[0]![1];
      await originalMethod('test_data');
      expect(testNestedMethod).toHaveBeenCalledWith('class-decorated-method', 'test_data');
    });
  });
});
