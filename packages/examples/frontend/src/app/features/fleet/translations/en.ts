import { TranslationObject } from '@ngx-translate/core';
import { PartialDeep } from 'type-fest';

export const EN = {
  title: 'Fleet',
} satisfies TranslationObject;

export type Translations = PartialDeep<typeof EN>;
