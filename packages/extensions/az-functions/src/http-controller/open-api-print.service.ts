import { inject, injectable } from 'inversify';
import { LOGGER_FACTORY, LoggerFactory } from 'logger';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as process from 'node:process';
import * as YAML from 'yaml';
import { OpenApiDefinitionService } from './open-api-definition.service';

@injectable()
export class OpenApiPrintService {
  private readonly logger;

  constructor(
    private readonly openApiDefinitionService: OpenApiDefinitionService,
    @inject(LOGGER_FACTORY) loggerFactory: LoggerFactory,
  ) {
    this.logger = loggerFactory();
  }

  printOpenApi(): void {
    const applications = this.openApiDefinitionService.getApplications();
    this.logger.info('Printing OpenAPI definitions started');

    const printPath = process.env.OPEN_API_PRINT_PATH ?? path.resolve(process.cwd(), 'dist/open-api-definitions');
    this.logger.verbose('Printing OpenAPI definitions started', {
      applications,
      printPath,
    });
    const printPathStat = fs.statSync(printPath, {
      throwIfNoEntry: false,
    });
    if (printPathStat === undefined) {
      fs.mkdirSync(printPath);
    }
    for (const application of applications) {
      try {
        this.logger.debug(`Printing OpenAPI definition for application ${application}`);
        const definition = this.openApiDefinitionService.generateDocument(application);
        let filePath = path.resolve(printPath, `${application}.json`);
        fs.writeFileSync(filePath, JSON.stringify(definition, null, 2));
        filePath = path.resolve(printPath, `${application}.yaml`);
        fs.writeFileSync(filePath, YAML.stringify(definition));
        this.logger.debug(`OpenAPI definition for application ${application} printed`);
      } catch (e) {
        this.logger.error(`Failed to print OpenAPI definition for application ${application}`, e);
      }
    }
  }
}
