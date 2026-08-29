import { getPartialFixture } from '@utilities/test-utilities';
import { mock, MockProxy } from 'jest-mock-extended';
import { Logger } from 'logger';
import * as fs from 'node:fs';
import { RestApplication } from './http-controller.model';
import { OpenApiDefinitionService } from './open-api-definition.service';
import { OpenApiPrintService } from './open-api-print.service';

jest.mock('node:fs');

describe('OpenApiPrintService', () => {
  const OLD_ENV = process.env;

  const testApplications = [
    getPartialFixture<RestApplication>({
      name: 'test-application1',
    }),
    getPartialFixture<RestApplication>({
      name: 'test-application2',
    }),
  ];

  let mockDefinitionService: MockProxy<OpenApiDefinitionService>;
  let mockLogger: MockProxy<Logger>;
  let openApiPrintService: OpenApiPrintService;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
    mockDefinitionService = mock<OpenApiDefinitionService>();
    mockDefinitionService.getApplications.mockReturnValue(testApplications.map(app => app.name));

    mockLogger = mock<Logger>();
    openApiPrintService = new OpenApiPrintService(mockDefinitionService, () => mockLogger);
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('should print OpenAPI definitions', () => {
    jest.spyOn(process, 'cwd').mockReturnValue('/my/test/path');

    openApiPrintService.printOpenApi();

    expect(mockDefinitionService.getApplications).toHaveBeenCalled();
    expect(mockDefinitionService.generateDocument).toHaveBeenCalledTimes(testApplications.length);
    expect(mockDefinitionService.generateDocument).toHaveBeenNthCalledWith(1, testApplications[0]!.name);
    expect(mockDefinitionService.generateDocument).toHaveBeenNthCalledWith(2, testApplications[1]!.name);
    expect(fs.writeFileSync).toHaveBeenCalledTimes(testApplications.length * 2);
  });

  it('should create the print path if it does not exist', () => {
    jest.spyOn(process, 'cwd').mockReturnValue('/my/test/path');
    jest.mocked(fs.statSync).mockReturnValue(undefined);

    openApiPrintService.printOpenApi();

    expect(fs.mkdirSync).toHaveBeenCalledWith('/my/test/path/dist/open-api-definitions');
  });

  it('should not create the print path if it exists', () => {
    jest.spyOn(process, 'cwd').mockReturnValue('/my/test/path');
    jest.mocked(fs.statSync).mockReturnValue({} as fs.Stats);

    openApiPrintService.printOpenApi();

    expect(fs.mkdirSync).not.toHaveBeenCalled();
  });

  it('should use OPEN_API_PRINT_PATH environment variable if set', () => {
    process.env.OPEN_API_PRINT_PATH = '/custom/print/path';

    openApiPrintService.printOpenApi();

    expect(fs.mkdirSync).toHaveBeenCalledWith('/custom/print/path');
  });

  it('should log an error if printing OpenAPI definition fails for an application', () => {
    const error = new Error('Test error');
    mockDefinitionService.generateDocument.mockImplementationOnce(() => {
      throw error;
    });

    openApiPrintService.printOpenApi();

    expect(mockLogger.error).toHaveBeenCalledWith(
      `Failed to print OpenAPI definition for application ${testApplications[0]!.name}`,
      error,
    );
  });
});
