import { HashUtilitiesService } from './hash-utilities.service';

describe('HashUtilitiesService', () => {
  let subject: HashUtilitiesService;

  beforeEach(() => {
    subject = new HashUtilitiesService();
  });

  describe('stringsToKey', () => {
    it('should create a key from strings', () => {
      const result = subject.stringsToKey('apple', 'banana', 'cherry');

      expect(result).toBe('5apple6banana6cherry');
    });
  });

  describe('stringToBucket', () => {
    it('should map string to a bucket consistently', () => {
      const bucket1 = subject.stringToBucket('test-string', 10);
      const bucket2 = subject.stringToBucket('test-string', 10);
      const bucket3 = subject.stringToBucket('test-string', 10, 'test-seed');
      const bucket4 = subject.stringToBucket('different-string', 10);
      const bucket5 = subject.stringToBucket('test-string', 20);

      expect(bucket1).toBeGreaterThanOrEqual(0);
      expect(bucket1).toBeLessThan(10);
      expect(bucket1).toEqual(bucket2);
      expect(bucket1).not.toEqual(bucket3);
      expect(bucket1).not.toEqual(bucket4);
      expect(bucket1).not.toEqual(bucket5);

      expect(bucket3).toBeGreaterThanOrEqual(0);
      expect(bucket3).toBeLessThan(10);
      expect(bucket4).toBeGreaterThanOrEqual(0);
      expect(bucket4).toBeLessThan(10);
      expect(bucket5).toBeGreaterThanOrEqual(0);
      expect(bucket5).toBeLessThan(20);
    });
  });

  describe('stringToHashString', () => {
    it('should create a hash string from input string', () => {
      const hash1 = subject.stringToHashString('test-string', 5);
      const hash2 = subject.stringToHashString('test-string', 5);
      const hash3 = subject.stringToHashString('test-string', 5, 'test-seed');
      const hash4 = subject.stringToHashString('different-string', 5);
      const hash5 = subject.stringToHashString('test-string', 8);
      const hash6 = subject.stringToHashString('test-string', 16, '', 16);

      expect(hash1).toHaveLength(5);
      expect(hash1).toEqual(hash2);
      expect(hash1).not.toEqual(hash3);
      expect(hash1).not.toEqual(hash4);
      expect(hash1).not.toEqual(hash5);
      expect(hash1).not.toEqual(hash6);

      expect(hash3).toHaveLength(5);
      expect(hash4).toHaveLength(5);
      expect(hash5).toHaveLength(8);
      expect(hash6).toHaveLength(16);
      expect(/^[0-9a-f]+$/.test(hash6)).toBeTrue();
    });
  });
});
