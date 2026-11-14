import { APP_CONFIG, AppConfigModule, ConfigError } from '@fleet-sight/shared/app-config';
import { Container } from 'inversify';

describe('App config', () => {
  const OLD_ENV = process.env;
  let container: Container;

  beforeEach(() => {
    container = new Container({ defaultScope: 'Singleton' });
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('should bind and retrieve APP_CONFIG correctly', () => {
    process.env = {
      ...OLD_ENV,
      PersistenceConnectionString: 'test-connection-string',
      PersistenceSecureConnection: 'false',
      PersistenceSchema: 'test-schema',
      WorkerCount: '4',
    };
    container.loadSync(AppConfigModule);

    const appConfig = container.get(APP_CONFIG);

    expect(appConfig).toEqual({
      persistence: {
        connectionString: 'test-connection-string',
        secureConnection: false,
        schema: 'test-schema',
      },
    });
  });

  it('should throw error if environment variables are missing', () => {
    process.env = { ...OLD_ENV };
    expect(() => {
      container.loadSync(AppConfigModule);
      container.get(APP_CONFIG);
    }).toThrowWithMessage(ConfigError, /^Invalid environment configuration:/);
  });
});
