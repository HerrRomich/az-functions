import { RestApplication } from '@herrromich/az-functions';

export const ORDERS_API = 'orders-api';
export const ORDERS_REST_APPLICATION: RestApplication = {
  name: ORDERS_API,
  context: 'orders-api',
  openApiConfig: {
    openapi: '3.0.1',
    info: {
      title: 'Orders API',
      version: '1.0.0',
      description: 'API for Fleet Sight Orders Management',
    },
    tags: [
      {
        name: 'Orders',
        description: 'Operations related to orders management',
      },
      {
        name: 'Customers',
        description: 'Operations related to customers management',
      },
    ],
    security: [
      {
        bearerHttpAuthentication: [],
      },
    ],
    components: {
      securitySchemes: {
        bearerHttpAuthentication: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
};
