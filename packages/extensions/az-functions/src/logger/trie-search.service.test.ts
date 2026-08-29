import { TrieSearchService } from './trie-search.service';

describe('TrieSearchService', () => {
  let subject: TrieSearchService<string>;

  beforeEach(() => {
    subject = new TrieSearchService<string>('.', 'default');
  });

  describe('getAll', () => {
    beforeEach(() => {
      subject.set('a.b.c', 'value1');
      subject.set('a.b', 'value2');
      subject.set('x.y', 'value3');
    });

    it('should return all key-value pairs from root', () => {
      const result = subject.getAll();

      expect(result).toEqual({
        '': 'default',
        'a.b': 'value2',
        'a.b.c': 'value1',
        'x.y': 'value3',
      });
    });

    it('should return all key-value pairs for a specific prefix if it is covered', () => {
      const result = subject.getAll('a.b');

      expect(result).toEqual({
        'a.b': 'value2',
        'a.b.c': 'value1',
      });
    });

    it('should return all key-value pairs for a specific prefix if it is not covered', () => {
      const result = subject.getAll('a.b.cd');

      expect(result).toEqual({});
    });
  });

  describe('get', () => {
    beforeEach(() => {
      subject.set('a.b.c', 'value1');
      subject.set('a.b', 'value2');
      subject.set('x.y', 'value3');
    });

    it('should return the value for a specific key', () => {
      expect(subject.get('a.b.c')).toBe('value1');
    });

    it('should return undefined for a non-existent key', () => {
      expect(subject.get('non.existent.key')).toBeUndefined();
    });
  });

  describe('find', () => {
    it('should return default value for unknown key', () => {
      expect(subject.find('unknown.key')).toBe('default');
    });

    it('should return default value for undefined key', () => {
      expect(subject.find(undefined)).toBe('default');
    });

    it('should return set value for known key', () => {
      subject.set('known.key', 'value1');

      expect(subject.find('known.key')).toBe('value1');
    });

    it('should return the most specific value for partial keys', () => {
      subject.set('a.b.c', 'value2');
      subject.set('a.b', 'value3');

      expect(subject.find('a.b.c.d')).toBe('value2');
      expect(subject.find('a.b.x')).toBe('value3');
    });

    it('should return root value for keys that do not match any set value', () => {
      subject.set('a.b.c', 'value2');
      subject.set('a.d', 'value3');

      expect(subject.find('a.b.f')).toBe('default');
    });
  });

  describe('set', () => {
    it('should not create nodes for undefined value', () => {
      subject.set('temp.key');

      expect(subject.find('temp.key')).toBe('default');
    });

    it('should create nodes and set value', () => {
      subject.set('new.key.path', 'newValue');

      expect(subject.find('new.key.path')).toBe('newValue');
    });

    it('should provide a parallel path for a new key', () => {
      subject.set('parallel.path.one', 'value1');
      subject.set('parallel.path.two', 'value2');

      expect(subject.find('parallel.path.one')).toBe('value1');
      expect(subject.find('parallel.path.two')).toBe('value2');
    });

    it('should overwrite existing value', () => {
      subject.set('overwrite.key', 'updatedValue');

      expect(subject.find('overwrite.key')).toBe('updatedValue');
    });

    it('should remove nodes when setting undefined value', () => {
      subject.set('remove', 'firstLevelValue');
      subject.set('remove.key.path', 'toBeRemoved');
      subject.set('remove.key.path');

      expect(subject.find('remove.key.path')).toBe('firstLevelValue');
    });

    it('should only remove specific path when setting undefined value', () => {
      subject.set('remove', 'firstLevelValue');
      subject.set('remove.key', 'secondLevelValue');
      subject.set('remove.key.path', 'toBeRemoved');
      subject.set('remove.key.path');

      expect(subject.find('remove.key.path')).toBe('secondLevelValue');
    });

    it("should not remove nodes if it doesn't exist when setting undefined value", () => {
      subject.set('existing.key.value', 'someValue');
      subject.set('existing.key');

      expect(subject.find('existing.key.value')).toBe('someValue');
    });

    it('should not remove nodes if not existing when setting undefined value', () => {
      subject.set('existing.key.value', 'someValue');
      subject.set('existing.key.value.next');

      const result = subject.find('existing.key.value');

      expect(result).toBe('someValue');
    });
  });
});
