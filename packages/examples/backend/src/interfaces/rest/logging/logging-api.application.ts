import { RestApplication } from '@herrromich/az-functions';

export const LOGGING_API = 'logging-api';
export const BEARER_HTTP_AUTHENTICATION = 'bearerHttpAuthentication';
export const LOGGING_REST_APPLICATION: RestApplication = {
  name: LOGGING_API,
  context: 'logging-api',
  openApiConfig: {
    openapi: '3.0.1',
    info: {
      title: 'Logging API',
      version: '1.0.0',
      description: 'API for Fleet Sight Logging',
    },
    tags: [
      {
        name: 'LogLevels',
        description: 'Operations for managing of log  levels',
      },
    ],
    security: [],
    components: {
      securitySchemes: {
        [BEARER_HTTP_AUTHENTICATION]: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
};
