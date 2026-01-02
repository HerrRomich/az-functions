import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { RouterModule } from '@angular/router';
import { EllipsisWithTooltipDirective } from '@fleet/shared/directives';
import { ScopedTranslatePipe } from '@fleet/shared/scoped-translations/scoped-translate.pipe';
import { Truck } from '../../models/truck-model';
import { DashboardService } from '../../services/dashboard.service';
import { OlMapService } from '../../services/ol-map.service';

interface StateIcon {
  icon: string;
  color: string;
}

const STATE_ICONS = {
  loading: { icon: 'mdi-upload-circle-outline', color: 'orange' },
  unloading: { icon: 'mdi-download-circle-outline', color: 'brown' },
  maintenance: { icon: 'mdi-wrench-clock', color: 'gray' },
  accelerating: { icon: 'mdi-arrow-top-right-thin-circle-outline', color: 'green' },
  decelerating: { icon: 'mdi-arrow-bottom-right-thin-circle-outline', color: 'red' },
  cruising: { icon: 'mdi-arrow-right-thin-circle-outline', color: 'blue' },
  idle: { icon: 'mdi-sleep', color: 'gray' },
} satisfies Record<string, StateIcon>;

@Component({
  selector: 'fs-truck-list',
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    ScopedTranslatePipe,
    MatButtonModule,
    MatIconModule,
    EllipsisWithTooltipDirective,
  ],
  templateUrl: './truck-list.component.html',
  styleUrl: './truck-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TruckList {
  private readonly dashboardService = inject(DashboardService);
  private readonly olMapService = inject(OlMapService);

  protected readonly displayedColumns = computed(() => {
    const mode = this.dashboardService.displayMode();
    return mode === 'list'
      ? ['state', 'speed', 'license-plate', 'driver', 'destination', 'actions']
      : ['state', 'license-plate'];
  });
  protected readonly trucks = this.dashboardService.trucks;
  protected readonly selectedTruck = this.dashboardService.selectedTruck;

  centerTruck(truckId: number) {
    this.olMapService.centerTruck(truckId);
  }

  getStateIcon(truck: Truck): StateIcon {
    switch (truck.status) {
      case 'idle':
        return STATE_ICONS.idle;
      case 'en_route':
        if (Math.abs(truck.acceleration) < 0.1) {
          return STATE_ICONS.cruising;
        } else if (truck.acceleration > 0) {
          return STATE_ICONS.accelerating;
        } else {
          return STATE_ICONS.decelerating;
        }
      case 'loading':
        return STATE_ICONS.loading;
      case 'unloading':
        return STATE_ICONS.unloading;
      case 'maintenance':
        return STATE_ICONS.maintenance;
    }
  }
}
