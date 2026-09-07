import { z } from 'zod';

export const TruckTelemetryDtoSchema = z
  .object({
    speed: z.number().openapi({
      description: 'The current speed of the truck in km/h',
      example: 93.6,
    }),
  })
  .openapi('TruckTelemetry');

export type TruckTelemetryDto = z.infer<typeof TruckTelemetryDtoSchema>;
