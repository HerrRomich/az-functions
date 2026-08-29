import { LOG_LEVEL_PROVIDER, LOGGER_NAME_PROVIDER } from '@herrromich/az-functions';
import { ContainerModule } from 'inversify';
import { LOGGER_NAME_PREFIX } from './logger.model';
import { TrieSearchLogLevelProvider } from './trie-search-log-level.provider';

export const LoggerModule = new ContainerModule(({ bind }) => {
  bind(LOGGER_NAME_PROVIDER).toFactory(() => {
    const regexp =
      /^\s*at\s+(?:new\s+)?([A-Za-z0-9_$]+)\s+\(.*packages[\\/]examples[\\/]backend[\\/]src[\\/](.+)\/[^\\/]+:\d+:\d+\)$/;
    return (stackEntry?: string) => {
      const stackLines = stackEntry?.split('\n') ?? [];
      let callerLine = stackLines.shift();
      while (callerLine !== undefined) {
        const match = regexp.exec(callerLine.trim());
        if (match !== null) {
          return `${LOGGER_NAME_PREFIX}.${match[2]?.replace(/\//g, '.')}.${match[1]}`;
        } else {
          callerLine = stackLines.shift();
        }
      }
    };
  });
  bind(TrieSearchLogLevelProvider).toSelf();
  bind(LOG_LEVEL_PROVIDER).toService(TrieSearchLogLevelProvider);
});

export * from './logger.model';
export * from './trie-search-log-level.provider';
