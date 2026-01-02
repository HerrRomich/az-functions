import { mock, mockDeep, MockProxy } from 'jest-mock-extended';
import { ControlledTransaction } from 'kysely';
import { TransactionManager, TransactionManagerError } from './transaction-manager.module';
import {
  getNestedTransactionalMethod,
  getNonTransactionalMethod,
  getTransactionalMethod,
} from './transactional-methods';
import { callMandatory, callNested, callNever, callNotSupported, callRequired } from './wrapper-methods';

jest.mock('./transactional-methods');

describe('Wrapper Methods', () => {
  let mockTransactionalManager: TransactionManager;
  let mockTransaction: ControlledTransaction<any> | undefined;
  let mockOriginalMethod: jest.Mock;
  let mockService: MockProxy<any>;
  let mockTransactionalMethod: jest.Mock;
  let mockNonTransactionalMethod: jest.Mock;
  let mockNestedTransactionalMethod: jest.Mock;

  beforeEach(() => {
    mockTransaction = undefined;
    mockTransactionalManager = mockDeep<TransactionManager>({
      storage: {
        get transaction() {
          return mockTransaction;
        },
        set transaction(_value: ControlledTransaction<any> | undefined) {
          // do nothing
        },
      },
    });
    mockOriginalMethod = jest.fn();
    mockService = mock<any>();

    mockTransactionalMethod = jest.fn();
    jest.mocked(getTransactionalMethod).mockReturnValue(mockTransactionalMethod);
    mockNonTransactionalMethod = jest.fn();
    jest.mocked(getNonTransactionalMethod).mockReturnValue(mockNonTransactionalMethod);
    mockNestedTransactionalMethod = jest.fn();
    jest.mocked(getNestedTransactionalMethod).mockReturnValue(mockNestedTransactionalMethod);
  });

  describe('callRequired', () => {
    it('should call getTransactionalMethod when no transaction exists', async () => {
      await callRequired(mockTransactionalManager, mockOriginalMethod, mockService, ['arg1', 'arg2']);

      expect(getTransactionalMethod).toHaveBeenCalledWith(mockTransactionalManager, mockOriginalMethod, mockService);
      expect(mockTransactionalMethod).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should call original method when a transaction exists', async () => {
      mockTransaction = mock<ControlledTransaction<any>>();

      await callRequired(mockTransactionalManager, mockOriginalMethod, mockService, ['arg1', 'arg2']);

      expect(mockOriginalMethod).toHaveBeenCalledWith('arg1', 'arg2');
      expect(getTransactionalMethod).not.toHaveBeenCalled();
    });
  });

  describe('callMandatory', () => {
    it('should throw an error when no transaction exists', async () => {
      await expect(
        callMandatory(mockTransactionalManager, mockOriginalMethod, mockService, ['arg1', 'arg2']),
      ).rejects.toThrowWithMessage(TransactionManagerError, 'No transaction found for propagation=mandatory');
    });

    it('should call original method when a transaction exists', async () => {
      mockTransaction = mock<ControlledTransaction<any>>();

      await callMandatory(mockTransactionalManager, mockOriginalMethod, mockService, ['arg1', 'arg2']);

      expect(mockOriginalMethod).toHaveBeenCalledWith('arg1', 'arg2');
    });
  });

  describe('callNever', () => {
    it('should call original method when no transaction exists', async () => {
      await callNever(mockTransactionalManager, mockOriginalMethod, mockService, ['arg1', 'arg2']);

      expect(mockOriginalMethod).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should throw an error when a transaction exists', async () => {
      mockTransaction = mock<ControlledTransaction<any>>();

      await expect(
        callNever(mockTransactionalManager, mockOriginalMethod, mockService, ['arg1', 'arg2']),
      ).rejects.toThrowWithMessage(TransactionManagerError, 'Transaction is found for propagation=never');
    });
  });

  describe('callNotSupported', () => {
    it('should call original method when no transaction exists', async () => {
      await callNotSupported(mockTransactionalManager, mockOriginalMethod, mockService, ['arg1', 'arg2']);

      expect(mockOriginalMethod).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should call getNonTransactionalMethod when a transaction exists', async () => {
      mockTransaction = mock<ControlledTransaction<any>>();

      await callNotSupported(mockTransactionalManager, mockOriginalMethod, mockService, ['arg1', 'arg2']);

      expect(getNonTransactionalMethod).toHaveBeenCalledWith(
        mockTransactionalManager.storage,
        mockOriginalMethod,
        mockService,
      );
      expect(mockNonTransactionalMethod).toHaveBeenCalledWith('arg1', 'arg2');
    });
  });

  describe('callNested', () => {
    it('should call getTransactionalMethod when no transaction exists', async () => {
      await callNested(mockTransactionalManager, mockOriginalMethod, mockService, ['arg1', 'arg2']);

      expect(getTransactionalMethod).toHaveBeenCalledWith(mockTransactionalManager, mockOriginalMethod, mockService);
      expect(mockTransactionalMethod).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should call getNestedTransactionalMethod when a transaction exists', async () => {
      mockTransaction = mock<ControlledTransaction<any>>();

      await callNested(mockTransactionalManager, mockOriginalMethod, mockService, ['arg1', 'arg2']);

      expect(getNestedTransactionalMethod).toHaveBeenCalledWith(
        mockTransaction,
        mockTransactionalManager.storage,
        mockOriginalMethod,
        mockService,
      );
      expect(mockNestedTransactionalMethod).toHaveBeenCalledWith('arg1', 'arg2');
    });
  });
});
