import { Container } from 'inversify';
import { HashUtilitiesService, UtilitiesModule } from './index';

describe('utils', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container({ defaultScope: 'Singleton' });
  });

  it('should load UtilitiesModule without errors', () => {
    container.loadSync(UtilitiesModule);

    const hashUtilitiesService = container.get(HashUtilitiesService);

    expect(hashUtilitiesService).toBeInstanceOf(HashUtilitiesService);
  });
});
