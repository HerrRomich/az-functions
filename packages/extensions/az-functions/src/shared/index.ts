import { ContainerModule } from 'inversify';
import * as path from 'node:path';
import { BASE_DIR } from './platform.model';

export * from './decorators';
export { serviceIdentifier } from './ioc-container.utils';
export * from './platform-context-local-storage';
export * from './platform.model';
export * from './security.model';
export { TrieSearchService } from './trie-search.service';

export const sharedModule = new ContainerModule(({ bind }) => {
  bind(BASE_DIR).toConstantValue(path.resolve(__dirname, '.'));
});
