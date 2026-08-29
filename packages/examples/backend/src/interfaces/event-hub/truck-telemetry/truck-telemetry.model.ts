import { z } from 'zod';

export const TruckTelemetryPayloadSchema = z.object({
  speed: z.number(),
});

export type TruckTelemetryPayload = z.infer<typeof TruckTelemetryPayloadSchema>;
