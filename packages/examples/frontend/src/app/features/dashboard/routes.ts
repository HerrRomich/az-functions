import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { provideScopedTranslateService } from '@fleet/shared/scoped-translations/scoped-translate.providers';
import { RouterConfigElementData } from '@fleet/shared/services/router-support/router-support.model';
import { InteractiveMap } from './components/interactive-map/interactive-map';
import { Dashboard } from './pages/dashboard/dashboard.component';
import { Truck } from './pages/truck/truck';
import { DashboardService } from './services/dashboard.service';
import { TruckStore } from './stores/truck-store';
import { TrucksStore } from './stores/trucks-store';

export const ROUTES: Routes = [
  {
    path: '',
    component: Dashboard,
    providers: [
      provideScopedTranslateService({
        translationKeyPrefix: 'app.features.dashboard',
        bundleLoaders: {
          en: () => import('./translations/en').then(m => m.EN),
          de: () => import('./translations/de').then(m => m.DE),
        },
      }),
      DashboardService,
      TrucksStore,
      TruckStore,
    ],
    canActivate: [
      async () => {
        const trucksStore = inject(TrucksStore);
        await trucksStore.load();
        return true;
      },
    ],
    canDeactivate: [
      () => {
        const trucksStore = inject(TrucksStore);
        trucksStore.reset();
        return true;
      },
    ],
    children: [
      {
        path: '',
        component: InteractiveMap,
      },
      {
        path: 'trucks',
        canDeactivate: [
          () => {
            const truckStore = inject(TruckStore);
            truckStore.reset();
            return true;
          },
        ],
        children: [
          {
            path: ':truckId',
            component: Truck,
            canActivate: [
              async route => {
                const truckId = route['params']['truckId'];
                const truckStore = inject(TruckStore);
                await truckStore.load(truckId);
                return true;
              },
            ],
            resolve: {
              menuBarElement: (): RouterConfigElementData => {
                const truckStore = inject(TruckStore);
                const licencePlate = truckStore.truck()!.licensePlate;
                return {
                  title: licencePlate,
                  breadcrumb: true,
                };
              },
            },
          },
        ],
      },
    ],
  },
];
