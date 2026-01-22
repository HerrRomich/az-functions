import { PLATFORM_MODE } from '@herrromich/az-functions';
import { Container } from 'inversify';
import { APP_CONFIG, appConfigModule, ConfigError } from 'shared/app.config';

describe('App config', () => {
  const OLD_ENV = process.env;
  let container: Container;

  beforeEach(() => {
    container = new Container({ defaultScope: 'Singleton' });
    container.bind(PLATFORM_MODE).toConstantValue('start');
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
    container.loadSync(appConfigModule);

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
      container.loadSync(appConfigModule);
      container.get(APP_CONFIG);
    }).toThrowWithMessage(ConfigError, /^Invalid environment configuration:/);
  });

  it('should provide dummy config in non-start mode', () => {
    container.rebindSync(PLATFORM_MODE).toConstantValue('print-open-api');
    container.loadSync(appConfigModule);

    const appConfig = container.get(APP_CONFIG);

    expect(appConfig).toEqual({
      persistence: {
        connectionString: 'dummy-connection-string',
        secureConnection: false,
        schema: 'dummy-schema',
      },
    });
  });
});
