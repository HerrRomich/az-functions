import { RestApplication } from '@herrromich/az-functions';

export const CONSOLE_API = 'console-api';
export const CONSOLE_API_APPLICATION: RestApplication = {
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
        name: 'DashboardService',
        description: 'Operations related to trucks management',
      },
      {
        name: 'Drivers',
        description: 'Operations related to drivers management',
      },
    ],
  },
};
