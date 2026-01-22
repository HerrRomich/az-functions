import { inject } from '@angular/core';
import { MsalGuardConfiguration, MsalInterceptorConfiguration } from '@azure/msal-angular';
import { BrowserCacheLocation, InteractionType, PublicClientApplication } from '@azure/msal-browser';
import { FleetSightConfigService } from '../config/fleet-sight-config.service';

export function MSALInstanceFactory(): PublicClientApplication {
  const config = inject(FleetSightConfigService).config;
  return new PublicClientApplication({
    auth: {
      clientId: config.APP_REGISTRATION_CLIENT_ID,
      authority: `https://login.microsoftonline.com/${config.APP_REGISTRATION_TENANT_ID}`,
      redirectUri: config.APP_URL,
      OIDCOptions: {
        responseMode: 'query',
      },
    },
    cache: {
      cacheLocation: BrowserCacheLocation.LocalStorage,
    },
  });
}

export function MSALGuardConfigFactory(): MsalGuardConfiguration {
  return {
    interactionType: InteractionType.Redirect,
    authRequest: {
      scopes: ['User.Read'],
    },
  };
}

export function MSALInterceptorConfigFactory(): MsalInterceptorConfiguration {
  const config = inject(FleetSightConfigService).config;
  return {
    interactionType: InteractionType.Redirect,
    protectedResourceMap: new Map([[`${config.APP_URL}/api/*`, [`api://${config.API_REGISTRATION_ID}/.default`]]]),
  };
}
