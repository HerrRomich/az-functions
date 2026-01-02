import { IStartupService, Logger, LOGGER_FACTORY, LoggerFactory } from '@herrromich/az-functions';
import { inject, injectable } from 'inversify';
import { FleetSightMigrationService } from './migration.service';

@injectable()
export class StartupService implements IStartupService {
  private readonly logger: Logger;
  constructor(
    private readonly migrationService: FleetSightMigrationService,
    @inject(LOGGER_FACTORY) loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory('StartupService');
  }

  async startup(): Promise<void> {
    try {
      this.logger.info('Starting database migration...');
      await this.migrationService.migrateToLatest();
      this.logger.info('Database migration completed successfully.');
    } catch (error) {
      this.logger.error('Database migration failed.', error);
      throw error;
    }
  }
}
