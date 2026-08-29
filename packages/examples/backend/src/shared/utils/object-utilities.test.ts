import { typedKeys } from './object-utilities';

describe('typedKeys', () => {
  it('should return the keys of a simple object', () => {
    const obj = { a: 1, b: 2, c: 3 };
    const keys = typedKeys(obj);
    expect(keys).toEqual(['a', 'b', 'c']);
  });

  it('should return an empty array for an empty object', () => {
    const obj = {};
    const keys = typedKeys(obj);
    expect(keys).toEqual([]);
  });

  it('should work with objects with string and number values', () => {
    const obj = { foo: 'bar', baz: 42 };
    const keys = typedKeys(obj);
    expect(keys).toEqual(['foo', 'baz']);
  });

  it('should preserve key types', () => {
    const obj = { x: 1, y: 2 };
    const keys = typedKeys(obj);
    // Type assertion: keys should be ('x' | 'y')[]
    expect(keys).toContain('x');
    expect(keys).toContain('y');
  });
});
