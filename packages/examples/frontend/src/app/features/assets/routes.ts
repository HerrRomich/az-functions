import { Routes } from '@angular/router';
import { provideScopedTranslateService } from '@fleet/shared/scoped-translations/scoped-translate.providers';
import { AssetsOverview } from './pages/assets-overview/assets-overview';

export const ROUTES: Routes = [
  {
    path: '',
    component: AssetsOverview,
    providers: [
      provideScopedTranslateService({
        translationKeyPrefix: 'features.assets',
        bundleLoaders: {
          en: () => import('./translations/en').then(m => m.EN),
          de: () => import('./translations/de').then(m => m.DE),
        },
      }),
    ],
  },
];
