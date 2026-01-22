import { z } from 'zod';
import * as zodGeoJSON from 'zod-geojson';

export const GeoJSONPointSchema = z
  .object(zodGeoJSON.GeoJSON2DPointSchema.shape)
  .pick({
    type: true,
    coordinates: true,
  })
  .openapi({
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

export type GeoJSONPoint = z.infer<typeof GeoJSONPointSchema>;
