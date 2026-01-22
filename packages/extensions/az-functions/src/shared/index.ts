import { ContainerModule } from 'inversify';
import * as path from 'node:path';
import { BASE_DIR } from './platform.model';
import { TriggerHandlerMetadataReader } from './trigger-handler-metadata.reader';

export { TrieSearchService } from '../logger/trie-search.service';
export * from './decorators';
export { serviceIdentifier } from './ioc-container.utils';
export * from './platform.model';
export * from './trigger-handler-metadata.reader';
export { parseWithZod, ZodParserError } from './zod-parser-wrapper';

export const SharedModule = new ContainerModule(({ bind }) => {
  bind(BASE_DIR).toConstantValue(path.resolve(__dirname, '.'));
  bind(TriggerHandlerMetadataReader).toSelf();
});
