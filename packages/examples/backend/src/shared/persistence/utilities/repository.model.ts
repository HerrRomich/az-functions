import { Point } from 'geojson';
import { GeoJSONPoint } from '../../rest';

export interface Pagination {
  offset: number;
  limit: number;
}

export interface RepositoryObjectWithTotal<T> {
  items: T[];
  total: number;
}

export class GeoJsonConversionError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function pointToGeoJsonPoint(point: Point): GeoJSONPoint;
export function pointToGeoJsonPoint(point: Point | null): GeoJSONPoint | undefined;
export function pointToGeoJsonPoint(point: Point | null): GeoJSONPoint | undefined {
  if (point === null) {
    return undefined;
  }
  if (point.coordinates.length !== 2) {
    throw new GeoJsonConversionError(`Invalid Point coordinates length: ${point.coordinates.length} expected 2`);
  }
  const [coordinate1, coordinate2] = point.coordinates;
  return { type: 'Point', coordinates: [coordinate1!, coordinate2!] };
}

export function geoJsonPointToPoint(geoJsonPoint: GeoJSONPoint): Point {
  if (geoJsonPoint.coordinates.length !== 2) {
    throw new GeoJsonConversionError(
      `Invalid GeoJSON Point coordinates length: ${geoJsonPoint.coordinates.length} expected 2`,
    );
  }
  const [coordinate1, coordinate2] = geoJsonPoint.coordinates;
  return { type: 'Point', coordinates: [coordinate1, coordinate2] };
}
