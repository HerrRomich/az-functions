import { serviceIdentifier } from '@herrromich/az-functions';
import { ContainerModule } from 'inversify';
import { z } from 'zod';

export class ConfigError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

const ProcessEnvSchema = z.object({
  PersistenceConnectionString: z.string(),
  PersistenceSecureConnection: z.string().transform(value => value.toLowerCase() === 'true'),
  EventHubConnection__fullyQualifiedNamespace: z.string(),
  PersistenceSchema: z.string(),
  ApiClientId: z.uuid(),
  TenantId: z.uuid(),
});

export interface AppConfig {
  persistence: {
    connectionString: string;
    secureConnection: boolean;
    schema: string;
  };
  eventHubNamespace: string;
  apiClientId: string;
  tenantId: string;
}

export const APP_CONFIG = serviceIdentifier<AppConfig>('FleetSight.Config');

export const AppConfigModule = new ContainerModule(({ bind }) => {
  bind(APP_CONFIG).toDynamicValue(() => {
    const processEnvData = ProcessEnvSchema.safeParse(process.env);
    if (!processEnvData.success) {
      throw new ConfigError(`Invalid environment configuration: ${processEnvData.error.message}`);
    }
    return {
      persistence: {
        connectionString: processEnvData.data.PersistenceConnectionString,
        secureConnection: processEnvData.data.PersistenceSecureConnection,
        schema: processEnvData.data.PersistenceSchema,
      },
      eventHubNamespace: processEnvData.data.EventHubConnection__fullyQualifiedNamespace,
      apiClientId: processEnvData.data.ApiClientId,
      tenantId: processEnvData.data.TenantId,
    };
  });
});
