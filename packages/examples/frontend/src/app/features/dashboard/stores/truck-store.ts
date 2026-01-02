import { inject } from '@angular/core';
import { DashboardService } from '@fleet/shared/apis/backend';
import { patchState, signalStore, withMethods, withProps, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { Truck } from '../models/truck-model';

export const TruckStore = signalStore(
  withState<{ truck: Truck | undefined }>({ truck: undefined }),
  withProps(() => ({
    _dashboardService: inject(DashboardService),
  })),
  withMethods(store => ({
    load: async (truckId: number) => {
      const truck = await firstValueFrom(store._dashboardService.getTruck(truckId));
      patchState(store, {
        truck,
      });
      return truck;
    },
    reset: () => {
      patchState(store, {
        truck: undefined,
      });
    },
  })),
);
Object.defineProperty(TruckStore, 'name', {
  value: 'TruckStore',
  writable: false,
});

export type TruckStore = InstanceType<typeof TruckStore>;
