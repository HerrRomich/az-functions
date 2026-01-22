import { Logger } from '@herrromich/az-functions';
import { mock, MockProxy } from 'jest-mock-extended';
import { FleetSightMigrationService } from 'shared/startup/migration.service';
import { StartupService } from 'shared/startup/startup.service';

describe('StartupService', () => {
  let mockLogger: MockProxy<Logger>;
  let mockMigrationService: MockProxy<FleetSightMigrationService>;

  let startupService: StartupService;

  beforeEach(() => {
    mockLogger = mock<Logger>();
    mockMigrationService = mock<FleetSightMigrationService>();

    startupService = new StartupService(() => mockLogger, mockMigrationService);
  });

  describe('startup', () => {
    it('should perform migration successfully', async () => {
      mockMigrationService.migrateToLatest.mockResolvedValue([
        { migrationName: '2024_01_01_initial_migration', status: 'Success', direction: 'Up' },
        { migrationName: '2024_02_01_first migration', status: 'Success', direction: 'Up' },
      ]);

      await startupService.startup();

      expect(mockLogger.info).toHaveBeenCalledWith('Starting database migration...');
      expect(mockMigrationService.migrateToLatest).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(`Database migration completed successfully:
- 2024_01_01_initial_migration: Success
- 2024_02_01_first migration: Success`);
    });

    it('should log and rethrow error if migration fails', async () => {
      const migrationError = new Error('Migration failed');
      mockMigrationService.migrateToLatest.mockRejectedValue(migrationError);

      await expect(startupService.startup()).rejects.toThrow(migrationError);

      expect(mockLogger.info).toHaveBeenCalledWith('Starting database migration...');
      expect(mockMigrationService.migrateToLatest).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith('Database migration failed.', migrationError);
    });
  });
});
