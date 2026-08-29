import { TranslationObject } from '@ngx-translate/core';
import { PartialDeep } from 'type-fest';

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

export type Translations = PartialDeep<typeof EN>;
