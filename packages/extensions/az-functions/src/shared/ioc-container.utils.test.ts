import { serviceIdentifier } from './ioc-container.utils';

class TestClass {}

describe('IoC Container Utils', () => {
  describe('serviceIdentifier', () => {
    it('should return a Symbol for the given identifier', () => {
      const identifier = 'Test description';
      const result = serviceIdentifier<TestClass>(identifier);

      expect(typeof result).toBe('symbol');
      expect((result as symbol).description).toBe(identifier);
    });
  });
});
