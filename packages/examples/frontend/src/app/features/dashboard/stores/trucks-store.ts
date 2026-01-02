import { inject } from '@angular/core';
import { DashboardService } from '@fleet/shared/apis/backend';
import { patchState, signalStore, withMethods, withProps, withState } from '@ngrx/signals';
import { removeAllEntities, setAllEntities, withEntities } from '@ngrx/signals/entities';
import { Extent } from 'ol/extent';
import { firstValueFrom } from 'rxjs';
import { Truck } from '../models/truck-model';

export const TrucksStore = signalStore(
  withState<{ box: Extent }>({
    box: [Infinity, Infinity, -Infinity, -Infinity],
  }),
  withEntities<Truck>(),
  withProps(() => ({
    _dashboardService: inject(DashboardService),
  })),
  withMethods(store => ({
    setBox: (box: Extent) => {
      patchState(store, { box });
    },
    load: async () => {
      const trucksResponse = await firstValueFrom(store._dashboardService.getTrucks());
      const trucks = trucksResponse.items.map<Truck>(item => item);
      patchState(store, setAllEntities(trucks));
      return trucks;
    },
    reset: () => {
      patchState(store, {
        box: [Infinity, Infinity, -Infinity, -Infinity],
      });
      patchState(store, removeAllEntities());
    },
  })),
);
Object.defineProperty(TrucksStore, 'name', {
  value: 'TrucksStore',
  writable: false,
});

export type FleetStore = InstanceType<typeof TrucksStore>;
