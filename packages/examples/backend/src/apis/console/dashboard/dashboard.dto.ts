import { GeoJSON2DPointSchema, IdDtoSchema, provideListResponseDtoSchema } from 'shared/rest';
import { z } from 'zod';

export const TruckStatusScheme = z.enum(['idle', 'en_route', 'loading', 'unloading', 'maintenance']).openapi({
  description: 'The current status of the truck',
  example: 'en_route',
});
export type TruckStatus = z.infer<typeof TruckStatusScheme>;

export const TruckDtoSchema = z
  .object({
    id: IdDtoSchema.openapi({
      description: 'The unique identifier of the truck',
    }),
    licensePlate: z.string().min(1).max(25).openapi({
      description: 'The license plate of the truck',
      example: 'ABC-1234',
    }),
    model: z.string().min(1).max(250).openapi({
      description: 'The model of the truck',
      example: 'Volvo FH16',
    }),
    driver: z
      .object({
        id: IdDtoSchema.openapi({
          description: 'The unique identifier of the driver assigned to the truck',
        }),
        name: z.string().openapi({
          description: 'The full name of the driver assigned to the truck',
          example: 'John Doe',
        }),
      })
      .optional()
      .openapi({
        description: 'The driver assigned to the truck',
      }),
    location: GeoJSON2DPointSchema.openapi({
      description: 'The current location of the truck as a GeoJSON Point',
      example: { type: 'Point', coordinates: [12.4924, 41.8902] },
    }),
    speed: z.number().min(0).openapi({
      description: 'The current speed of the truck in km/h',
      example: 93.6,
    }),
    acceleration: z.number().openapi({
      description: 'The current acceleration of the truck in m/s²',
      example: 1.5,
    }),
    fuelLevel: z.number().min(0).max(100).openapi({
      description: 'The current fuel level of the truck as a percentage',
      example: 75.5,
    }),
    destinationAddress: z.string().min(1).max(250).optional().openapi({
      description: 'The destination address of the truck if it is on a run',
      example: 'Bahnhofstrasse 1, 8001 Zürich, Switzerland',
    }),
    destinationPoint: GeoJSON2DPointSchema.optional().openapi({
      description: 'The destination point of the truck as a GeoJSON Point if it is on a run',
      example: { type: 'Point', coordinates: [8.5417, 47.3769] },
    }),
    status: TruckStatusScheme,
    run: z.number().min(0).optional(),
  })
  .openapi('Truck');

export type TruckDto = z.infer<typeof TruckDtoSchema>;

export const TrucksResponseDtoSchema = provideListResponseDtoSchema(TruckDtoSchema).openapi('TrucksResponseDto');

export type TrucksResponseDto = z.infer<typeof TrucksResponseDtoSchema>;
