import { DataSource } from '@herrromich/transaction-manager';
import { getPartialFixture } from '@utilities/test-utilities';
import { mock, MockProxy } from 'jest-mock-extended';
import { Migrator } from 'kysely';
import { AppConfig } from 'shared/app.config';
import { FleetSightMigrationProvider } from './migration.provider';
import { FleetSightMigrationService, MigrationError } from './migration.service';

jest.mock('kysely', () => {
  const actualKysely = jest.requireActual('kysely');
  return {
    ...actualKysely,
    Migrator: jest.fn(),
  };
});

describe('Migration service', () => {
  let mockDataSource: MockProxy<DataSource<unknown>>;
  let mockMigrationProvider: MockProxy<FleetSightMigrationProvider>;
  let subject: FleetSightMigrationService;

  beforeEach(() => {
    mockDataSource = mock<DataSource<unknown>>();
    mockMigrationProvider = mock<FleetSightMigrationProvider>();

    const testAppConfig = getPartialFixture<AppConfig>({
      persistence: {
        schema: 'test-schema',
      },
    });
    subject = new FleetSightMigrationService(testAppConfig, mockDataSource, mockMigrationProvider);
  });

  describe('migrateToLatest', () => {
    let mockMigrator: MockProxy<Migrator>;

    beforeEach(() => {
      mockMigrator = mock<Migrator>();
      jest.mocked(Migrator).mockReturnValue(mockMigrator);
    });

    it('should call migrator to migrate to latest', async () => {
      mockMigrator.migrateToLatest.mockResolvedValue({ error: undefined });

      await subject.migrateToLatest();

      expect(Migrator).toHaveBeenCalledWith({
        db: mockDataSource,
        provider: mockMigrationProvider,
        migrationTableSchema: 'test-schema',
      });
      expect(mockMigrator.migrateToLatest).toHaveBeenCalled();
    });

    it('should throw MigrationError if migration fails', async () => {
      const migrationError = new Error('Migration failed');
      mockMigrator.migrateToLatest.mockResolvedValue({ error: migrationError });

      await expect(subject.migrateToLatest()).rejects.toThrowWithMessage(MigrationError, 'Migration is failed');

      expect(Migrator).toHaveBeenCalledWith({
        db: mockDataSource,
        provider: mockMigrationProvider,
        migrationTableSchema: 'test-schema',
      });
      expect(mockMigrator.migrateToLatest).toHaveBeenCalled();
    });
  });
});
