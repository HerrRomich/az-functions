import { InjectionToken } from '@angular/core';
import { provideChildTranslateService, TranslateLoader } from '@ngx-translate/core';
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
    }),
    {
      provide: TRANSLATION_NAMESPACE_TOKEN,
      useValue: translationNamespace,
    },
    {
      provide: ScopedTranslateService,
    },
  ];
}
