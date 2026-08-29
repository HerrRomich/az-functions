import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterModule } from '@angular/router';
import { BreadcrumbComponent } from '@fleet/shared/components/breadcrumb/breadcrumb.component';
import { ScopedTranslatePipe } from '@fleet/shared/scoped-translations/scoped-translate.pipe';

@Component({
  selector: 'fs-root',
  imports: [RouterModule, MatToolbarModule, MatButtonModule, ScopedTranslatePipe, BreadcrumbComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  protected readonly features: { route: string; translationKey: string }[] = [
    {
      route: 'dashboard',
      translationKey: 'app.features.dashboard.title',
    },
    {
      route: 'assets',
      translationKey: 'app.features.assets.title',
    },
    {
      route: 'fleet',
      translationKey: 'app.features.fleet.title',
    },
  ];
}
