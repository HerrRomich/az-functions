import { Kysely } from 'kysely';
import { DEFAULT_DATA_SOURCE_NAME, TransactionManagerError } from './transaction-manager.model';
import {
  deleteTransactionManager,
  registerDataSource,
  resetTransactionManagers,
  transactionManagers,
} from './transaction-manager.module';

class DummyKysely {
  testMethod() {
    return 'dummy-kysely-test-method-result';
  }

  private _testProperty = 'dummy-kysely-test-property';

  get testProperty() {
    return this._testProperty;
  }

  set testProperty(value: string) {
    this._testProperty = value;
  }

  private _testReadOnlyProperty = 'dummy-kysely-test-readonly-property';

  get testReadOnlyProperty() {
    return this._testReadOnlyProperty;
  }

  set testWriteOnlyproperty(value: string) {
    this._testReadOnlyProperty = value;
  }
}

describe('TransactionManager Module', () => {
  beforeEach(() => {
    resetTransactionManagers();
  });

  describe('registerDataSource', () => {
    it('should register a named data source without errors', () => {
      registerDataSource(() => {
        // Mock Kysely instance
        return new DummyKysely() as any;
      }, 'test-data-source');

      expect(transactionManagers['test-data-source']).toBeDefined();
      expect(transactionManagers['test-data-source']!.kysely).toBeInstanceOf(DummyKysely);
      expect(transactionManagers['test-data-source']!.storage).toBeDefined();
      expect(transactionManagers['test-data-source']!.storage.transaction).toBeUndefined();
    });

    it('should register a data source with default name without errors', () => {
      registerDataSource(() => {
        // Mock Kysely instance
        return new DummyKysely() as any;
      });

      expect(transactionManagers[DEFAULT_DATA_SOURCE_NAME]).toBeDefined();
      expect(transactionManagers[DEFAULT_DATA_SOURCE_NAME]!.kysely).toBeInstanceOf(DummyKysely);
      expect(transactionManagers[DEFAULT_DATA_SOURCE_NAME]!.storage).toBeDefined();
      expect(transactionManagers[DEFAULT_DATA_SOURCE_NAME]!.storage.transaction).toBeUndefined();
    });

    it('should allow method calls on the registered data source', () => {
      const dummyKysely = new DummyKysely();

      const dataSource = registerDataSource(() => {
        // Mock Kysely instance
        return dummyKysely as Partial<Kysely<any>> as Kysely<any>;
      }) as unknown as DummyKysely;

      expect(dataSource).not.toBe(dummyKysely);

      expect(dataSource.testMethod()).toEqual('dummy-kysely-test-method-result');
      expect(dataSource.testProperty).toBe('dummy-kysely-test-property');
      dataSource.testProperty = 'newValue';
      expect(dataSource.testProperty).toBe('newValue');

      expect(dataSource.testReadOnlyProperty).toBe('dummy-kysely-test-readonly-property');

      dataSource.testWriteOnlyproperty = 'newReadOnlyValue';
      expect(dataSource.testReadOnlyProperty).toBe('newReadOnlyValue');
    });

    it('should throw an error when registering a data source with a duplicate name', () => {
      registerDataSource(() => {
        return new DummyKysely() as any;
      }, 'duplicate-data-source');

      expect(() => {
        registerDataSource(() => {
          return new DummyKysely() as any;
        }, 'duplicate-data-source');
      }).toThrowWithMessage(
        TransactionManagerError,
        "Data source with name 'duplicate-data-source' is already registered.",
      );
    });
  });

  describe('resetTransactionManagers', () => {
    it('should clear all registered transaction managers', () => {
      registerDataSource(() => {
        return new DummyKysely() as any;
      }, 'data-source-1');

      registerDataSource(() => {
        return new DummyKysely() as any;
      }, 'data-source-2');

      expect(Object.keys(transactionManagers)).toHaveLength(2);

      resetTransactionManagers();

      expect(Object.keys(transactionManagers)).toHaveLength(0);
    });
  });

  describe('deleteTransactionManager', () => {
    it('should throw an error when deleting a non-registered data source', () => {
      expect(() => {
        deleteTransactionManager('non-registered-data-source');
      }).toThrowWithMessage(
        TransactionManagerError,
        "Data source with name 'non-registered-data-source' is not registered.",
      );
    });

    it('should delete a registered data source without errors', () => {
      registerDataSource(() => {
        return new DummyKysely() as any;
      }, 'data-source-to-delete');

      expect(transactionManagers['data-source-to-delete']).toBeDefined();

      deleteTransactionManager('data-source-to-delete');

      expect(transactionManagers['data-source-to-delete']).toBeUndefined();
    });
  });
});
