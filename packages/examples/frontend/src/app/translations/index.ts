import { inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export * from './de';
export * from './en';

export const TRANSLATION_LANGUAGES = ['en', 'de'] as const;

export type TranslationLanguage = (typeof TRANSLATION_LANGUAGES)[number];

export function initializeTranslateService() {
  const translateService = inject(TranslateService);
  translateService.addLangs([...TRANSLATION_LANGUAGES]);
  const lang = TranslateService.getBrowserLang() ?? 'en';
  translateService.use(lang);
  translateService.setFallbackLang('en');
}
