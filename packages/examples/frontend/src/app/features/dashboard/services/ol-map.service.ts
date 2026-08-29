import { effect, inject, Injectable, OnDestroy } from '@angular/core';
import { Feature, Map, View } from 'ol';
import { Point } from 'ol/geom';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import { fromLonLat } from 'ol/proj';
import { OSM } from 'ol/source';
import VectorSource from 'ol/source/Vector';
import { Fill, Stroke, Style, Text } from 'ol/style';
import { ViewOptions } from 'ol/View';
import { z } from 'zod';
import { TrucksStore } from '../stores/trucks-store';

const ViewSettingsSchema = z.object({
  center: z.tuple([z.number(), z.number()]),
  zoom: z.number().min(0).max(28), // OpenLayers supports zoom levels from 0 to 28
});

@Injectable()
export class OlMapService implements OnDestroy {
  private readonly fleetStore = inject(TrucksStore);
  private readonly map: Map;

  constructor() {
    const source = new VectorSource();
    const view = new View(this.getViewOptions());
    this.map = new Map({
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

    this.map.on('moveend', () => {
      const view = this.map.getView();
      this.fleetStore.setBox(view.calculateExtent(this.map.getSize()));
    });
    view.on('change', () => {
      this.setViewOptions({
        center: this.map.getView().getCenter(),
        zoom: this.map.getView().getZoom(),
      });
    });
    effect(() => {
      const trucksMap = this.fleetStore.entityMap();
      source.forEachFeature(feature => {
        const featureId = feature.getId();
        if (featureId === undefined || trucksMap[featureId] === undefined) {
          source.removeFeature(feature);
        } else {
          const truck = trucksMap[featureId];
          feature.setGeometry(new Point(truck.location.coordinates));
        }
      });
      const trucks = this.fleetStore.entities();
      for (const truck of trucks) {
        if (!source.getFeatureById(truck.id)) {
          const feature = new Feature({
            geometry: new Point(fromLonLat(truck.location.coordinates)),
          });
          feature.setId(truck.id);
          feature.setStyle(
            new Style({
              text: new Text({
                text: truck.licensePlate,
                font: '18px Roboto',
                backgroundFill: new Fill({ color: 'rgba(230, 230, 230, 1)' }),
                padding: [3, 3, 3, 3],
                textAlign: 'left',
                stroke: new Stroke({ color: '#fff', width: 2 }),
              }),
            }),
          );
          source.addFeature(feature);
        }
      }
    });
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
