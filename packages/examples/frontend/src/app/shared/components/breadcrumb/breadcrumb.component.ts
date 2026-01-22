import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { OptTranslatePipe } from '@fleet/shared/pipes';
import { RouterSupportService } from '@fleet/shared/services';

@Component({
  standalone: true,
  selector: 'fs-breadcrumb',
  imports: [RouterModule, OptTranslatePipe],
  templateUrl: './breadcrumb.component.html',
  styleUrl: './breadcrumb.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreadcrumbComponent {
  private readonly routerSupportService = inject(RouterSupportService);
  readonly breadcrumb = this.routerSupportService.breadcrumb;
}
