import { Container } from 'inversify';
import * as path from 'path';
import { BASE_DIR, sharedModule } from './index';

describe('shared module', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container({ defaultScope: 'Singleton' });
    container.loadSync(sharedModule);
  });

  describe('BASE_DIR', () => {
    it('should get the base directory', () => {
      const baseDir = container.get<string>(BASE_DIR);

      expect(baseDir).toEqual(path.resolve(__dirname, '.'));
    });
  });
});
