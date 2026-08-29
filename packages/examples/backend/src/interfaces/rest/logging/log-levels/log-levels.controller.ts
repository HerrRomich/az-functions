import { ZodContentObject } from '@asteasolutions/zod-to-openapi';
import { HttpResponseInit } from '@azure/functions';
import { LOGGER_NAME_PREFIX, TrieSearchLogLevelProvider } from '@fleet-sight/shared/logger';
import { PERSISTENCE_KYSELY_LOGGER_NAME } from '@fleet-sight/shared/persistence/module';
import {
  Delete,
  DirectResponseObject,
  Get,
  HttpController,
  HttpDirectResponseBuilder,
  Put,
  QueryParam,
  StringSchema,
  SYSTEM_LOGGER_NAME_PREFIX,
} from '@herrromich/az-functions';
import { BEARER_HTTP_AUTHENTICATION, LOGGING_API } from '../logging-api.application';
import { LogLevel, LogLevels, LogLevelSchema, LogLevelsSchema } from './log-levels.model';

const LogLevelsResponseContent: ZodContentObject = {
  'application/json': {
    schema: LogLevelsSchema,
    example: {
      [SYSTEM_LOGGER_NAME_PREFIX]: 'warn',
      [LOGGER_NAME_PREFIX]: 'info',
      [PERSISTENCE_KYSELY_LOGGER_NAME]: 'error',
    },
  },
};

const LogLevelsDirectResponse: DirectResponseObject = {
  description: 'Current log levels for all loggers',
  jsonContent: LogLevelsResponseContent['application/json'],
};

@HttpController({
  application: LOGGING_API,
  path: '/log-levels',
  tags: ['LogLevels'],
})
export class LogLevelsController {
  constructor(private readonly logLevelProvider: TrieSearchLogLevelProvider) {}

  @Get({
    security: [
      {
        [BEARER_HTTP_AUTHENTICATION]: ['log-levels.read'],
      },
    ],
    description: 'Get current log levels for all logger names, starting with specified loggerName prefix if provided',
    directResponse: LogLevelsDirectResponse,
  })
  getLogLevels(
    @QueryParam({
      name: 'loggerName',
      schema: StringSchema.optional().openapi({
        description:
          'Optional prefix to filter logger names by. If provided, only loggers with names starting with this prefix will be included in the response.',
        example: `${LOGGER_NAME_PREFIX}`,
      }),
    })
    loggerName?: string,
  ): LogLevels {
    return this.logLevelProvider.getAll(loggerName);
  }

  @Put({
    security: [
      {
        [BEARER_HTTP_AUTHENTICATION]: ['log-levels.set'],
      },
    ],
    description: 'Set log level for a specific logger',
    responses: {
      '200': {
        description: 'Log level set successfully',
        content: LogLevelsResponseContent,
      },
      '304': {
        description: 'Not Modified - The log level is already set to the specified value',
      },
    },
  })
  setLogLevel(
    @QueryParam({
      name: 'loggerName',
      schema: StringSchema.openapi({
        description: 'Name of the logger to set the log level for',
        example: `${LOGGER_NAME_PREFIX}.folder1.folder2.folder3.service-name`,
      }),
    })
    loggerName: string,
    @QueryParam({
      name: 'logLevel',
      schema: LogLevelSchema.openapi({
        description: 'Log level to set for the logger',
        example: 'debug',
      }),
    })
    logLevel: LogLevel,
  ): HttpResponseInit {
    const responseBuilder = HttpDirectResponseBuilder.builder<LogLevels>();
    const currentLogLevel = this.logLevelProvider.get(loggerName);
    if (currentLogLevel === logLevel) {
      responseBuilder.status(304);
    } else {
      this.logLevelProvider.set(loggerName, logLevel);
      responseBuilder.jsonBody(this.logLevelProvider.getAll(loggerName));
    }
    return responseBuilder.build();
  }

  @Delete({
    security: [
      {
        [BEARER_HTTP_AUTHENTICATION]: ['log-levels.set'],
      },
    ],
    description: 'Reset log level for a specific logger to default',
    responses: {
      '200': {
        description: 'Log level reset successfully',
        content: LogLevelsResponseContent,
      },
      '304': {
        description: 'Not Modified - The log level is not configured',
      },
    },
  })
  resetLogLevel(
    @QueryParam({
      name: 'loggerName',
      schema: StringSchema.openapi({
        description: 'Name of the logger to reset the log level for',
        example: `${LOGGER_NAME_PREFIX}.folder1.folder2.folder3.service-name`,
      }),
    })
    loggerName: string,
  ): HttpResponseInit {
    const responseBuilder = HttpDirectResponseBuilder.builder<LogLevels>();
    const currentLogLevel = this.logLevelProvider.get(loggerName);
    if (currentLogLevel === undefined) {
      responseBuilder.status(304);
    } else {
      this.logLevelProvider.set(loggerName);
      responseBuilder.jsonBody(this.logLevelProvider.getAll(loggerName));
    }
    return responseBuilder.build();
  }
}
