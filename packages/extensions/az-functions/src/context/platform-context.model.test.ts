import { createPlatformContextValueKey } from './platform-context.model';

describe('platform-InvocationCtx.model', () => {
  describe('createPlatformContextValueKey', () => {
    it('should create a unique key for the given name', () => {
      const key1 = createPlatformContextValueKey('Test key 1');
      const key2 = createPlatformContextValueKey('Test key 2');

      expect(key1).not.toBe(key2);
      expect(key1.description).toEqual('Test key 1');
      expect(key2.description).toEqual('Test key 2');
    });
  });
});
