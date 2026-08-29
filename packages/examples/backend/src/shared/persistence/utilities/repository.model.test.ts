import { Point } from 'geojson';
import { GeoJsonConversionError, pointToGeoJsonPoint } from './repository.model';

describe('Persistence Repository Model', () => {
  describe('pointToGeoJsonPoint', () => {
    it('should convert Point to GeoJSONPoint', () => {
      const point: Point = { type: 'Point', coordinates: [10, 20] };
      const result = pointToGeoJsonPoint(point);
      expect(result).toEqual({ type: 'Point', coordinates: [10, 20] });
    });

    it('should return undefined for null Point', () => {
      const result = pointToGeoJsonPoint(null);
      expect(result).toBeUndefined();
    });

    it('should throw GeoJsonConversionError for invalid coordinates length', () => {
      const point: Point = { type: 'Point', coordinates: [10] };
      expect(() => pointToGeoJsonPoint(point)).toThrowWithMessage(
        GeoJsonConversionError,
        'Invalid Point coordinates length: 1 expected 2',
      );
    });
  });
});
