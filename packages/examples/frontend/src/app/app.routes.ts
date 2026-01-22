import { inject } from '@angular/core';
import { Routes } from '@angular/router';
import { MsalGuard } from '@azure/msal-angular';
import { UserAccountService } from '@fleet/shared/auth/user-account.service';
import { RouterConfigElementData } from '@fleet/shared/services/router-support/router-support.model';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'prefix',
    canActivate: [
      MsalGuard,
      () => {
        const userService = inject(UserAccountService);
        const userAccount = userService.userAccount();
        return true;
      },
    ],
    children: [
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
    ],
  },
];
