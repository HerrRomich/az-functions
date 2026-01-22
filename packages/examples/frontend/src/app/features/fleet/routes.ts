import { Routes } from '@angular/router';
import { provideScopedTranslateService } from '@fleet/shared/scoped-translations/scoped-translate.providers';
import { FleetOverview } from './pages/fleet-overview/fleet-overview';

export const ROUTES: Routes = [
  {
    path: '',
    component: FleetOverview,
    providers: [
      provideScopedTranslateService({
        translationNamespace: 'features.fleet',
        bundleLoaders: {
          en: () => import('./translations/en').then(m => m.EN),
          de: () => import('./translations/de').then(m => m.DE),
        },
      }),
    ],
  },
];
