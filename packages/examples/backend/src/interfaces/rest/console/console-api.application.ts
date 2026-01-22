import { BEARER_HTTP_AUTHENTICATION } from '@fleet-sight/shared/security/index';
import { RestApplication } from '@herrromich/az-functions';

export const CONSOLE_API = 'console-api';
export const CONSOLE_REST_APPLICATION: RestApplication = {
  name: CONSOLE_API,
  context: 'console-api',
  openApiConfig: {
    openapi: '3.0.1',
    info: {
      title: 'Console API',
      version: '1.0.0',
      description: 'API for Fleet Sight Console',
    },
    tags: [
      {
        name: 'Trucks',
        description: 'Operations related to trucks management',
      },
      {
        name: 'Drivers',
        description: 'Operations related to drivers management',
      },
    ],
    security: [
      {
        [BEARER_HTTP_AUTHENTICATION]: [],
      },
    ],
    components: {
      securitySchemes: {
        [BEARER_HTTP_AUTHENTICATION]: {
          type: 'http',
          name: '',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
};
