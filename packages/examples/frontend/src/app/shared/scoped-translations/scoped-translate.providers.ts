import { inject, InjectionToken } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { provideChildTranslateService, TranslateLoader, TranslateService, TranslateStore } from '@ngx-translate/core';
import { distinct, map } from 'rxjs';
import { CodeTranslateLoader } from './code-translate-loader';
import { ScopedTranslateService } from './scoped-translate.service';
import { TranslationBundleLoaders } from './scoped-translations.model';

export const TRANSLATION_NAMESPACE_TOKEN = new InjectionToken<string>('TRANSLATION_NAMESPACE_TOKEN');
export interface ScopedTranslateProvidersOptions {
  translationNamespace?: string;
  bundleLoaders: TranslationBundleLoaders;
}

export function provideScopedTranslateService(options?: ScopedTranslateProvidersOptions) {
  const translationNamespace = options?.translationNamespace ?? '';
  const bundleLoaders = options?.bundleLoaders ?? {};
  return [
    provideChildTranslateService({
      loader: {
        provide: TranslateLoader,
        useFactory: () => new CodeTranslateLoader(bundleLoaders, translationNamespace),
      },
      extend: true,
    }),
    {
      provide: TRANSLATION_NAMESPACE_TOKEN,
      useFactory: () => {
        const translateStore = inject(TranslateStore);
        const translateService = inject(TranslateService);
        const currentLang = translateStore.getCurrentLang();
        translateService.use(currentLang);
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
        return translationNamespace;
      },
      deps: [TranslateStore, TranslateService],
    },
    {
      provide: ScopedTranslateService,
    },
  ];
}
