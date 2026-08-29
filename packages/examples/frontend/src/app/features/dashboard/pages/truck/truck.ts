import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import { DashboardService } from '../../services/dashboard.service';

@Component({
  selector: 'fs-truck',
  imports: [RouterModule, MatButtonModule, MatIconModule],
  templateUrl: './truck.html',
  styleUrl: './truck.scss',
})
export class Truck {
  private readonly router = inject(Router);
  private readonly dashboardService = inject(DashboardService);

  protected readonly selectedTruck = this.dashboardService.selectedTruck;

  async close() {
    await this.router.navigate(['/dashboard']);
  }
}
