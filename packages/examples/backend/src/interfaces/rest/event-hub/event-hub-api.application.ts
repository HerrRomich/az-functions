import { RestApplication } from '@herrromich/az-functions';

export const EVENT_HUB_API = 'event-hub-api';
export const EVENT_HUB_REST_APPLICATION: RestApplication = {
  name: EVENT_HUB_API,
  context: 'event-hub-api',
  openApiConfig: {
    openapi: '3.0.1',
    info: {
      title: 'Event Hub API',
      version: '1.0.0',
      description: 'API for Fleet Sight Event Hub',
    },
    tags: [
      {
        name: 'EventHub',
        description: 'Operations for managing of Event Hub',
      },
    ],
  },
};
