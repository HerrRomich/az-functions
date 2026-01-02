import { Routes } from '@angular/router';
import { RouterConfigElementData } from '@fleet/shared/services/router-support/router-support.model';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    data: {
      menuBarElement: {
        title: { key: 'app.features.dashboard.title' },
      } satisfies RouterConfigElementData,
    },
    loadChildren: () => import('./features/dashboard').then(m => m.ROUTES),
  },
  {
    path: 'fleet',
    loadChildren: () => import('./features/fleet').then(m => m.ROUTES),
  },
  {
    path: 'assets',
    loadChildren: () => import('./features/assets').then(m => m.ROUTES),
  },
];
