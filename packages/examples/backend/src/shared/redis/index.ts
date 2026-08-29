import { DefaultAzureCredential } from '@azure/identity';
import { createCluster } from '@redis/client';
import { EntraIdCredentialsProviderFactory, REDIS_SCOPE_DEFAULT } from '@redis/entraid';
import { ContainerModule } from 'inversify';

export const RedisModule = new ContainerModule(options => {
  const redisUrl = process.env.REDIS_ENDPOINT;
  if (redisUrl !== undefined) {
    options.bind('').toDynamicValue(() => {
      const credential = new DefaultAzureCredential();
      const credentialsProvider = EntraIdCredentialsProviderFactory.createForDefaultAzureCredential({
        credential,
        scopes: REDIS_SCOPE_DEFAULT,
        tokenManagerConfig: {
          expirationRefreshRatio: 0.8,
        },
      });
      return createCluster({
        rootNodes: [
          {
            url: process.env.REDIS_URL ?? 'redis://localhost:6379',
          },
        ],
        defaults: {
          credentialsProvider,
          socket: { tls: true },
        },
      });
    });
  }
});
