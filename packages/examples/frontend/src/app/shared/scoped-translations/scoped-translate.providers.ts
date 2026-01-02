import { inject, InjectionToken } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { provideChildTranslateService, TranslateLoader, TranslateService, TranslateStore } from '@ngx-translate/core';
import { distinct, map } from 'rxjs';
import { CodeTranslateLoader } from './code-translate-loader';
import { ScopedTranslateService } from './scoped-translate.service';
import { TranslationBundleLoaders } from './scoped-translations.model';

export const SCOPED_TRANSLATION_KEY_PREFIX_TOKEN = new InjectionToken<string>('SCOPED_TRANSLATION_KEY_PREFIX_TOKEN');
export interface ScopedTranslateProvidersOptions {
  translationKeyPrefix?: string;
  bundleLoaders: TranslationBundleLoaders;
}

export function provideScopedTranslateService(options?: ScopedTranslateProvidersOptions) {
  const translationKeyPrefix = options?.translationKeyPrefix ?? '';
  const bundleLoaders = options?.bundleLoaders ?? {};
  return [
    provideChildTranslateService({
      loader: {
        provide: TranslateLoader,
        useFactory: () => new CodeTranslateLoader(bundleLoaders, translationKeyPrefix),
      },
      extend: true,
    }),
    {
      provide: SCOPED_TRANSLATION_KEY_PREFIX_TOKEN,
      useFactory: () => {
        const translateStore = inject(TranslateStore);
        const translateService = inject(TranslateService);
        const currentLang = translateStore.getCurrentLang();
        if (currentLang !== undefined) {
          translateService.use(currentLang);
        }
        const fallbackLang = translateStore.getFallbackLang();
        if (fallbackLang !== null) {
          translateService.setFallbackLang(fallbackLang);
        }

        translateStore.onLangChange
          .pipe(
            takeUntilDestroyed(),
            map(event => event.lang),
            distinct(),
          )
          .subscribe(lang => {
            translateService.use(lang);
          });
        return translationKeyPrefix;
      },
      deps: [TranslateStore, TranslateService],
    },
    {
      provide: ScopedTranslateService,
    },
  ];
}
