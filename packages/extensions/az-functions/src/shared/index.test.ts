import { Container } from 'inversify';
import * as path from 'path';
import { BASE_DIR, parseWithZod, serviceIdentifier, SharedModule, TrieSearchService, ZodParserError } from './index';

describe('exports', () => {
  it('should export correctly', () => {
    expect(TrieSearchService).toBeDefined();
    expect(serviceIdentifier).toBeDefined();
    expect(parseWithZod).toBeFunction();
    expect(ZodParserError).toBeFunction();
  });
});

describe('shared module', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container({ defaultScope: 'Singleton' });
    container.loadSync(SharedModule);
  });

  describe('BASE_DIR', () => {
    it('should get the base directory', () => {
      const baseDir = container.get<string>(BASE_DIR);

      expect(baseDir).toEqual(path.resolve(__dirname, '.'));
    });
  });
});
