import { AfterViewInit, ChangeDetectionStrategy, Component, inject, OnDestroy } from '@angular/core';
import { OlMapService } from '../../services/ol-map.service';

@Component({
  selector: 'fs-interactive-map',
  imports: [],
  templateUrl: './interactive-map.html',
  styleUrl: './interactive-map.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    id: 'map',
  },
})
export class InteractiveMap implements AfterViewInit, OnDestroy {
  private readonly olMapService = inject(OlMapService);

  ngAfterViewInit(): void {
    this.olMapService.setTarget('map');
  }

  ngOnDestroy(): void {
    this.olMapService.setTarget();
  }
}
