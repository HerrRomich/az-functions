import * as zodGeoJSON from 'zod-geojson';

export const GeoJSON2DPointSchema = zodGeoJSON.GeoJSON2DPointSchema.openapi({
  type: 'object',
  properties: {
    type: { type: 'string', enum: ['Point'] },
    coordinates: {
      type: 'array',
      items: { type: 'number' },
      minItems: 2,
      maxItems: 2,
    },
  },
  required: ['type', 'coordinates'],
});
