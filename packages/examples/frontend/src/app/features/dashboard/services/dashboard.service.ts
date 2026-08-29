import { computed, inject, Injectable } from '@angular/core';
import { TruckStore } from '../stores/truck-store';
import { TrucksStore } from '../stores/trucks-store';

@Injectable()
export class DashboardService {
  private readonly trucksStore = inject(TrucksStore);
  private readonly truckStore = inject(TruckStore);

  readonly trucks = this.trucksStore.entities;
  readonly selectedTruck = this.truckStore.truck;
  readonly displayMode = computed(() => (this.selectedTruck() ? 'detail' : 'list'));
}
