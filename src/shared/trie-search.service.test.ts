import { TrieSearchService } from './trie-search.service';

describe('TrieSearchService', () => {
  let subject: TrieSearchService<string>;

  beforeEach(() => {
    subject = new TrieSearchService<string>('default');
  });

  describe('get', () => {
    it('should return default value for unknown key', () => {
      const result = subject.get('unknown.key');

      expect(result).toBe('default');
    });

    it('should return default value for undefined key', () => {
      const result = subject.get(undefined);

      expect(result).toBe('default');
    });

    it('should return set value for known key', () => {
      subject.set('known.key', 'value1');

      const result = subject.get('known.key');

      expect(result).toBe('value1');
    });

    it('should return the most specific value for partial keys', () => {
      subject.set('a.b.c', 'value2');
      subject.set('a.b', 'value3');

      const result1 = subject.get('a.b.c.d');
      const result2 = subject.get('a.b.x');

      expect(result1).toBe('value2');
      expect(result2).toBe('value3');
    });
  });

  describe('set', () => {
    it('should not create nodes for undefined value', () => {
      subject.set('temp.key');

      const result = subject.get('temp.key');

      expect(result).toBe('default');
    });

    it('should create nodes and set value', () => {
      subject.set('new.key.path', 'newValue');

      const result = subject.get('new.key.path');

      expect(result).toBe('newValue');
    });

    it('should overwrite existing value', () => {
      subject.set('overwrite.key', 'updatedValue');

      const result = subject.get('overwrite.key');

      expect(result).toBe('updatedValue');
    });

    it('should remove nodes when setting undefined value', () => {
      subject.set('remove', 'firstLevelValue');
      subject.set('remove.key.path', 'toBeRemoved');
      subject.set('remove.key.path');

      const result = subject.get('remove.key.path');

      expect(result).toBe('firstLevelValue');
    });

    it('should only remove specific path when setting undefined value', () => {
      subject.set('remove', 'firstLevelValue');
      subject.set('remove.key', 'secondLevelValue');
      subject.set('remove.key.path', 'toBeRemoved');
      subject.set('remove.key.path');

      const result = subject.get('remove.key.path');

      expect(result).toBe('secondLevelValue');
    });

    it("should not remove nodes if it doesn't exist when setting undefined value", () => {
      subject.set('existing.key.value', 'someValue');
      subject.set('existing.key');

      const result = subject.get('existing.key.value');

      expect(result).toBe('someValue');
    });

    it('shold not remove nodes if not existing when setting undefined value', () => {
      subject.set('existing.key.value', 'someValue');
      subject.set('existing.key.value.next');

      const result = subject.get('existing.key.value');

      expect(result).toBe('someValue');
    });
  });
});
