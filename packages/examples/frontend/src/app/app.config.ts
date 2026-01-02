import {
  ApplicationConfig,
  importProvidersFrom,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import * as backend from '@fleet/shared/apis/backend';

import { provideHttpClient } from '@angular/common/http';
import { provideScopedTranslateService } from '@fleet/shared//scoped-translations/scoped-translate.providers';
import { RouterSupportService } from '@fleet/shared/services';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(),
    provideTranslateService({
      fallbackLang: 'en',
      lang: 'en',
      extend: true,
    }),
    RouterSupportService,
    importProvidersFrom([
      backend.ApiModule.forRoot(
        () =>
          new backend.Configuration({
            basePath: '/api/console-api',
          }),
      ),
    ]),
    provideScopedTranslateService({
      bundleLoaders: {
        en: () => import('./translations').then(m => m.EN),
        de: () => import('./translations').then(m => m.DE),
      },
    }),
    provideAppInitializer(() => {
      const translateService = inject(TranslateService);
      translateService.addLangs(['en', 'de']);
      const lang = TranslateService.getBrowserLang() ?? 'en';
      translateService.use(lang);
      translateService.setFallbackLang('en');
    }),
  ],
};
