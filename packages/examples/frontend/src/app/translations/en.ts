import { TranslationObject } from '@ngx-translate/core';
import { PartialDeep } from 'type-fest';

export const EN = {
  app: {
    title: 'Fleet Sight',
    features: {
      dashboard: {
        title: 'Dashboard',
      },
      assets: {
        title: 'Assets',
      },
      fleet: {
        title: 'Fleet',
      },
    },
  },
  shared: {},
} satisfies TranslationObject;

export type Translations = PartialDeep<typeof EN>;
