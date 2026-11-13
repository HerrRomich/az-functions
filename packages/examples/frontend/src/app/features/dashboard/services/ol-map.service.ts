import { effect, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { Feature, Map, View } from 'ol';
import { Point } from 'ol/geom';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import { fromLonLat } from 'ol/proj';
import { OSM } from 'ol/source';
import VectorSource from 'ol/source/Vector';
import { Style } from 'ol/style';
import { ViewOptions } from 'ol/View';
import { z } from 'zod';
import { Truck } from '../models/truck-model';
import { TrucksStore } from '../stores/trucks-store';

const ViewSettingsSchema = z.object({
  center: z.tuple([z.number(), z.number()]),
  zoom: z.number().min(0).max(28), // OpenLayers supports zoom levels from 0 to 28
});

@Injectable()
export class OlMapService implements OnDestroy {
  private readonly fleetStore = inject(TrucksStore);
  private readonly map: Map;
  readonly selectedTruck = signal<string | undefined>(undefined);
  private prevSelectedTruck: string | undefined = undefined;

  constructor() {
    const source = new VectorSource();
    this.map = this.initMap(source);
    effect(() => {
      const trucks = this.fleetStore.entities();
      for (const truck of trucks) {
        if (!source.getFeatureById(truck.id)) {
          const feature = new Feature({
            geometry: new Point(fromLonLat(truck.location.coordinates)),
          });
          feature.setId(truck.id);
          feature.setGeometry(new Point(fromLonLat(truck.location.coordinates)));
          feature.setStyle(this.getTruckStyle(truck));
          source.addFeature(feature);
        }
      }
    });
    effect(() => {
      const selectedTruckId = this.selectedTruck();
      const trucksMap = this.fleetStore.entityMap();
      const selectedTruck = selectedTruckId !== undefined ? trucksMap[selectedTruckId] : undefined;
      const prevSelectedTruck = this.prevSelectedTruck !== undefined ? trucksMap[this.prevSelectedTruck] : undefined;
      if (selectedTruck !== undefined) {
        const truckFeature = source.getFeatureById(selectedTruck.id);
        truckFeature?.setStyle(this.getTruckStyle(selectedTruck, true));
      }
      if (prevSelectedTruck !== undefined) {
        const truckFeature = source.getFeatureById(prevSelectedTruck.id);
        truckFeature?.setStyle(this.getTruckStyle(prevSelectedTruck, false));
      }
      this.prevSelectedTruck = selectedTruck?.id;
    });
  }

  private getTruckStyle(truck: Truck, isSelected = false): Style {
    const color = isSelected ? 'rgba(255, 0, 0, 1)' : 'rgba(0, 0, 255, 1)';
    return new Style({
      zIndex: isSelected ? 1000 : 0,
      renderer: (coordinates, state) => {
        const context = state.context;
        if (!Array.isArray(coordinates) || typeof coordinates[0] !== 'number' || typeof coordinates[1] !== 'number')
          return;
        const [x, y] = coordinates;
        const label = truck.licensePlate;

        context.save();
        context.font = '18px Roboto';
        context.textAlign = 'center';
        context.textBaseline = 'middle';

        const width = context.measureText(label).width + 16;
        const height = 18;

        context.beginPath();
        context.moveTo(x - width / 2 + 8, y - height - 16);
        context.lineTo(x + width / 2 - 8, y - height - 16);
        context.arcTo(x + width / 2, y - height - 16, x + width / 2, y - height - 8, 8);
        context.lineTo(x + width / 2, y - 16);
        context.arcTo(x + width / 2, y - 8, x + width / 2 - 8, y - 8, 8);
        context.lineTo(x - 4, y - 8);
        context.lineTo(x, y);
        context.lineTo(x - 8, y - 8);
        context.lineTo(x - width / 2 + 8, y - 8);
        context.arcTo(x - width / 2, y - 8, x - width / 2, y - height - 8, 8);
        context.lineTo(x - width / 2, y - height - 8);
        context.arcTo(x - width / 2, y - height - 16, x - width / 2 + 8, y - height - 16, 8);
        context.closePath();
        context.fillStyle = 'rgba(230, 230, 230, 1)';
        context.fill();
        context.strokeStyle = '#555';
        context.lineWidth = 1;
        context.stroke();

        context.fillStyle = color;
        context.font = '18px Roboto';
        context.fillText(label, x, y - 10 - height / 2);
        context.restore();
      },
    });
  }

  private initMap(source: VectorSource): Map {
    const view = new View(this.getViewOptions());
    const map = new Map({
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        new VectorLayer({
          source,
        }),
      ],
      view: view,
      controls: [],
    });

    map.on('moveend', () => {
      const view = this.map.getView();
      this.fleetStore.setBox(view.calculateExtent(this.map.getSize()));
    });
    view.on('change', () => {
      this.setViewOptions({
        center: this.map.getView().getCenter(),
        zoom: this.map.getView().getZoom(),
      });
    });
    return map;
  }

  ngOnDestroy(): void {
    this.map.setTarget();
    this.map.dispose();
  }

  private getViewOptions(): ViewOptions {
    const optionsSerialized = localStorage.getItem('FLEET-SIGHT.DASHBOARD.MAP.VIEW');
    try {
      return ViewSettingsSchema.parse(JSON.parse(optionsSerialized ?? ''));
    } catch {
      return {
        center: fromLonLat([11.582, 48.1351]), // Munich
        zoom: 12,
      };
    }
  }

  private setViewOptions(options: ViewOptions): void {
    localStorage.setItem('FLEET-SIGHT.DASHBOARD.MAP.VIEW', JSON.stringify(options));
  }

  setTarget(target?: string): void {
    this.map.setTarget(target);
  }

  centerTruck(truckId: number) {
    const truck = this.fleetStore.entityMap()[truckId];
    if (truck !== undefined) {
      const coordinates = fromLonLat(truck.location.coordinates);
      this.map.getView().animate({ center: coordinates, duration: 500 });
    }
  }
}
