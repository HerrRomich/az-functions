import { DeepMockProxy, mock, mockDeep, MockProxy } from 'jest-mock-extended';
import { Command, ControlledTransaction, ControlledTransactionBuilder, IsolationLevel } from 'kysely';
import { Isolation } from './decorators';
import { TransactionManager } from './transaction-manager.module';
import {
  getNestedTransactionalMethod,
  getNonTransactionalMethod,
  getTransactionalMethod,
} from './transactional-methods';

jest.mock('uuid', () => ({
  v4: () => 'unique-savepoint-id',
}));

describe('transactional methods', () => {
  let mockTransactionalManager: DeepMockProxy<TransactionManager>;
  let mockTransactionBuilder: MockProxy<ControlledTransactionBuilder<any>>;
  let mockStartedTransaction: MockProxy<ControlledTransaction<any>>;
  let mockStoredTransaction: ControlledTransaction<any> | undefined;
  let mockOriginalMethod: jest.Mock;
  let mockService: MockProxy<any>;

  beforeEach(() => {
    mockStoredTransaction = undefined;
    mockTransactionBuilder = mock<ControlledTransactionBuilder<any>>();
    mockTransactionalManager = mockDeep<TransactionManager>({
      kysely: {
        startTransaction: jest.fn().mockReturnValue(mockTransactionBuilder),
      },
      storage: {
        get transaction() {
          return mockStoredTransaction;
        },
        set transaction(_value: ControlledTransaction<any> | undefined) {
          // do nothing
        },
      },
    });
    mockTransactionalManager.storage.run.mockImplementation(async (_store, fn) => {
      return fn();
    });
    mockOriginalMethod = jest.fn().mockResolvedValue('original-method-result');
    mockService = mock<any>();
    mockStartedTransaction = mock<ControlledTransaction<any>>();
  });

  describe('getTransactionalMethod', () => {
    let mockCommitCommand: MockProxy<Command<void>>;
    let mockRollbackCommand: MockProxy<Command<void>>;

    beforeEach(() => {
      mockTransactionBuilder.execute.mockResolvedValue(mockStartedTransaction);
      mockCommitCommand = mock<Command<void>>();
      mockStartedTransaction.commit.mockReturnValue(mockCommitCommand);
      mockRollbackCommand = mock<Command<void>>();
      mockStartedTransaction.rollback.mockReturnValue(mockRollbackCommand);
    });

    it.each<[Isolation, IsolationLevel]>([
      ['read_commited', 'read committed'],
      ['read_uncommited', 'read uncommitted'],
      ['repeatable_read', 'repeatable read'],
      ['serializable', 'serializable'],
    ])('should set isolation level %s when provided in config', async (isolationInput, expectedIsolation) => {
      const transactionalMethod = getTransactionalMethod(mockTransactionalManager, mockOriginalMethod, mockService, {
        isolation: isolationInput,
      });

      await transactionalMethod();

      expect(mockTransactionBuilder.setIsolationLevel).toHaveBeenCalledWith(expectedIsolation);
    });

    it('should commit the transaction after successful method execution', async () => {
      const transactionalMethod = getTransactionalMethod(mockTransactionalManager, mockOriginalMethod, mockService);

      const result = await transactionalMethod('arg1', 'arg2');

      expect(mockTransactionalManager.storage.run).toHaveBeenCalledWith(
        { transaction: mockStartedTransaction },
        expect.any(Function),
      );
      expect(mockOriginalMethod).toHaveBeenCalledWith('arg1', 'arg2');
      expect(mockStartedTransaction.commit).toHaveBeenCalled();
      expect(mockCommitCommand.execute).toHaveBeenCalled();
      expect(mockStartedTransaction.rollback).not.toHaveBeenCalled();
      expect(mockRollbackCommand.execute).not.toHaveBeenCalled();
      expect(result).toBe('original-method-result');
    });

    it('should rollback the transaction if method execution throws an error', async () => {
      const transactionalMethod = getTransactionalMethod(mockTransactionalManager, mockOriginalMethod, mockService);
      const testError = new Error('Test method error');
      mockOriginalMethod.mockRejectedValueOnce(testError);

      await expect(transactionalMethod('arg1', 'arg2')).rejects.toThrow(testError);

      expect(mockTransactionalManager.storage.run).toHaveBeenCalledWith(
        { transaction: mockStartedTransaction },
        expect.any(Function),
      );
      expect(mockOriginalMethod).toHaveBeenCalledWith('arg1', 'arg2');
      expect(mockStartedTransaction.commit).not.toHaveBeenCalled();
      expect(mockCommitCommand.execute).not.toHaveBeenCalled();
      expect(mockStartedTransaction.rollback).toHaveBeenCalled();
      expect(mockRollbackCommand.execute).toHaveBeenCalled();
    });
  });

  describe('getNonTransactionalMethod', () => {
    it('should run the original method without a transaction', async () => {
      const nonTransactionalMethod = getNonTransactionalMethod(
        mockTransactionalManager.storage,
        mockOriginalMethod,
        mockService,
      );

      const result = await nonTransactionalMethod('arg1', 'arg2');

      expect(mockTransactionalManager.storage.run).toHaveBeenCalledWith({}, expect.any(Function));
      expect(mockOriginalMethod).toHaveBeenCalledWith('arg1', 'arg2');
      expect(result).toBe('original-method-result');
    });
  });

  describe('getNestedTransactionalMethod', () => {
    let mockNestedTransaction: MockProxy<ControlledTransaction<any, [string]>>;
    let mockSavepointCommand: MockProxy<Command<ControlledTransaction<any, [string]>>>;
    let mockReleaseCommand: MockProxy<Command<ControlledTransaction<any>>>;
    let mockRollbackToSavepointCommand: MockProxy<Command<ControlledTransaction<any, [string]>>>;

    beforeEach(() => {
      mockSavepointCommand = mock<Command<ControlledTransaction<any, [string]>>>();
      mockStartedTransaction.savepoint.calledWith('unique-savepoint-id').mockReturnValue(mockSavepointCommand);
      mockNestedTransaction = mock<ControlledTransaction<any, [string]>>();
      mockSavepointCommand.execute.mockResolvedValue(mockNestedTransaction);

      mockReleaseCommand = mock<Command<ControlledTransaction<any>>>();
      mockNestedTransaction.releaseSavepoint.calledWith('unique-savepoint-id').mockReturnValue(mockReleaseCommand);

      mockRollbackToSavepointCommand = mock<Command<ControlledTransaction<any, [string]>>>();
      mockNestedTransaction.rollbackToSavepoint
        .calledWith('unique-savepoint-id')
        .mockReturnValue(mockRollbackToSavepointCommand);
    });

    it('should create a savepoint and release it after successful method execution', async () => {
      const nestedTransactionalMethod = getNestedTransactionalMethod(
        mockStartedTransaction,
        mockTransactionalManager.storage,
        mockOriginalMethod,
        mockService,
      );

      const result = await nestedTransactionalMethod('arg1', 'arg2');

      expect(mockTransactionalManager.storage.run).toHaveBeenCalledWith(
        { transaction: mockNestedTransaction },
        expect.any(Function),
      );
      expect(mockOriginalMethod).toHaveBeenCalledWith('arg1', 'arg2');
      expect(mockNestedTransaction.rollbackToSavepoint).not.toHaveBeenCalled();
      expect(mockNestedTransaction.releaseSavepoint).toHaveBeenCalledWith('unique-savepoint-id');
      expect(result).toBe('original-method-result');
    });

    it('should rollback to the savepoint if method execution throws an error', async () => {
      const nestedTransactionalMethod = getNestedTransactionalMethod(
        mockStartedTransaction,
        mockTransactionalManager.storage,
        mockOriginalMethod,
        mockService,
      );
      const testError = new Error('Test method error');
      mockOriginalMethod.mockRejectedValueOnce(testError);

      await expect(nestedTransactionalMethod('arg1', 'arg2')).rejects.toThrow(testError);

      expect(mockTransactionalManager.storage.run).toHaveBeenCalledWith(
        { transaction: mockNestedTransaction },
        expect.any(Function),
      );
      expect(mockOriginalMethod).toHaveBeenCalledWith('arg1', 'arg2');
      expect(mockNestedTransaction.rollbackToSavepoint).toHaveBeenCalledWith('unique-savepoint-id');
      expect(mockNestedTransaction.releaseSavepoint).toHaveBeenCalledWith('unique-savepoint-id');
    });
  });
});
