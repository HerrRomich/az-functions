import { TranslationObject } from '@ngx-translate/core';

export const EN = {
  'truck-list': {
    table: {
      columns: {
        'license-plate': 'License Plate',
        'driver': 'Driver Name',
        'destination': 'Destination',
        'speed': 'Speed',
      },
    },
  },
} satisfies TranslationObject;

export type Translations = typeof EN;
