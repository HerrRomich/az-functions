import { inject } from '@angular/core';
import { TrucksService } from '@fleet/shared/apis/backend';
import { patchState, signalStore, withMethods, withProps, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';
import { Truck } from '../models/truck-model';

export const TruckStore = signalStore(
  withState<{ truck: Truck | undefined }>({ truck: undefined }),
  withProps(() => ({
    _truckService: inject(TrucksService),
  })),
  withMethods(store => ({
    load: async (truckId: string) => {
      const truck = await firstValueFrom(store._truckService.getTruck(truckId));
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
