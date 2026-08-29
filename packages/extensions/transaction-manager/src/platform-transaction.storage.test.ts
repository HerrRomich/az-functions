import { mock } from 'jest-mock-extended';
import { ControlledTransaction } from 'kysely';
import { PlatformTransactionLocalStorage } from './platform-transaction.storage';

describe('PlatformTransactionStorage', () => {
  let subject: PlatformTransactionLocalStorage<any>;

  beforeEach(() => {
    subject = new PlatformTransactionLocalStorage<any>();
  });

  describe('transaction getter', () => {
    it('should have undefined transaction when no store is set', () => {
      expect(subject.transaction).toBeUndefined();
    });

    it('should return the transaction from the current store', () => {
      const mockTransaction = mock<ControlledTransaction<any, string[]>>();
      subject.run({ transaction: mockTransaction }, () => {
        expect(subject.transaction).toBe(mockTransaction);
      });
    });

    it('should return undefined when the current store has no transaction', () => {
      subject.run({}, () => {
        expect(subject.transaction).toBeUndefined();
      });
    });
  });
});
