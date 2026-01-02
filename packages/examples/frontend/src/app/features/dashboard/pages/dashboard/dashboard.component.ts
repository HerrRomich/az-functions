import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatDividerModule } from '@angular/material/divider';
import { RouterModule } from '@angular/router';
import { TruckList } from '../../components/truck-list/truck-list.component';
import { DashboardService } from '../../services/dashboard.service';
import { OlMapService } from '../../services/ol-map.service';

@Component({
  selector: 'fs-dashboard',
  imports: [CommonModule, RouterModule, TruckList, MatDividerModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  providers: [OlMapService],
})
export class Dashboard {
  private readonly dashboardService = inject(DashboardService);

  protected readonly displayMode = this.dashboardService.displayMode;
}
