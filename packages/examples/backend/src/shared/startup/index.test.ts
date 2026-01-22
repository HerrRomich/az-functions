import { Logger, LOGGER_FACTORY, STARTUP_SERVICE } from '@herrromich/az-functions';
import { DataSource } from '@herrromich/transaction-manager';
import { Container } from 'inversify';
import { mock, MockProxy } from 'jest-mock-extended';
import { APP_CONFIG, AppConfig } from 'shared/app.config';
import { StartupModule } from '.';
import { HashUtilitiesService } from '../utils';
import { MIGRATION } from './migration.model';
import { InitialMigration } from './migrations/2024-06-01T12_00_00-initial/2024-06-01T12_00_00-initial.migration';
import { StartupService } from './startup.service';

jest.mock('./migrations/2024-06-01T12_00_00-initial/2024-06-01T12_00_00-initial.migration');

describe('StartupModule', () => {
  let mockLogger: MockProxy<Logger>;
  let container: Container;

  beforeEach(() => {
    mockLogger = mock<Logger>();
    container = new Container();
    container.bind(LOGGER_FACTORY).toFactory(() => () => mockLogger);
    container.bind(APP_CONFIG).toConstantValue({
      persistence: {
        schema: 'test-schema',
      },
    } as AppConfig);

    container.bind(DataSource).toConstantValue(mock<DataSource<unknown>>());
    container.bind(HashUtilitiesService).toConstantValue(mock<HashUtilitiesService>());
  });

  it('should load StartupModule without errors', () => {
    container.loadSync(StartupModule);
    const startupService = container.get(STARTUP_SERVICE);
    const migrations = container.getAll(MIGRATION);

    expect(container.isBound(STARTUP_SERVICE)).toBe(true);
    expect(startupService).toBeInstanceOf(StartupService);

    expect(migrations.length).toEqual(1);
    expect(InitialMigration).toHaveBeenCalled();
  });
});
