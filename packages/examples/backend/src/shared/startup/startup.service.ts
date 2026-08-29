import { IStartupService, Logger, LOGGER_FACTORY, LoggerFactory } from '@herrromich/az-functions';
import { inject, injectable } from 'inversify';
import { FleetSightMigrationService } from './migration.service';

@injectable()
export class StartupService implements IStartupService {
  private readonly logger: Logger;
  constructor(
    @inject(LOGGER_FACTORY) loggerFactory: LoggerFactory,
    private readonly migrationService: FleetSightMigrationService,
  ) {
    this.logger = loggerFactory();
  }

  async startup(): Promise<void> {
    this.logger.info('Starting database migrations.');
    const results = await this.migrationService.migrateToLatest();
    this.logger.info(`Successfully completed ${results?.length ?? 0} database migrations.`);
    this.logger.debug('Successfully completed database migrations.', { results });
  }
}
