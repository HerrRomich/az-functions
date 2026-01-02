import { GeoJSONPoint } from 'ol/format/GeoJSON';

export interface Truck {
  id: number;
  licensePlate: string;
  model: string;
  location: GeoJSONPoint;
  speed: number;
  acceleration: number;
  fuelLevel: number;
  driver?: {
    id: number;
    name: string;
  };
  status: 'idle' | 'en_route' | 'loading' | 'unloading' | 'maintenance';
}
