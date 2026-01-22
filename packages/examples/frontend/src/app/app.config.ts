import {
  ApplicationConfig,
  importProvidersFrom,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import * as backend from '@fleet/shared/apis/backend';

import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import {
  MSAL_GUARD_CONFIG,
  MSAL_INSTANCE,
  MSAL_INTERCEPTOR_CONFIG,
  MsalBroadcastService,
  MsalGuard,
  MsalInterceptor,
  MsalService,
} from '@azure/msal-angular';
import { MSALGuardConfigFactory, MSALInstanceFactory, MSALInterceptorConfigFactory } from '@fleet/shared/auth';
import { UserAccountService } from '@fleet/shared/auth/user-account.service';
import { loadFleetSightConfig } from '@fleet/shared/config';
import { FleetSightConfigService } from '@fleet/shared/config/fleet-sight-config.service';
import { registerIcons } from '@fleet/shared/icons';
import { provideScopedTranslateService } from '@fleet/shared/scoped-translations';
import { RouterSupportService } from '@fleet/shared/services';
import { provideTranslateService } from '@ngx-translate/core';
import { routes } from './app.routes';
import { initializeTranslateService } from './translations';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withHashLocation()),
    provideHttpClient(withInterceptorsFromDi()),
    { provide: HTTP_INTERCEPTORS, useClass: MsalInterceptor, multi: true },

    { provide: MSAL_INSTANCE, useFactory: MSALInstanceFactory },
    { provide: MSAL_GUARD_CONFIG, useFactory: MSALGuardConfigFactory },
    { provide: MSAL_INTERCEPTOR_CONFIG, useFactory: MSALInterceptorConfigFactory },

    MsalService,
    MsalGuard,
    MsalBroadcastService,
    MsalInterceptor,
    UserAccountService,

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
    FleetSightConfigService,
    provideAppInitializer(() => {
      return loadFleetSightConfig();
    }),
    provideAppInitializer(() => {
      initializeTranslateService();
      registerIcons();
    }),
  ],
};
