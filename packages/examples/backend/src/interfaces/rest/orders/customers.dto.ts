import { IdDtoSchema } from '@fleet-sight/shared/rest';
import { z } from 'zod';

export const CustomerDtoSchema = z
  .object({
    id: IdDtoSchema.openapi({
      description: 'The unique identifier of the customer',
      example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    }),
    name: z.string().openapi({
      description: 'The name of the customer',
      example: 'Acme Corporation',
    }),
    email: z.email().openapi({
      description: 'The email address of the customer',
      example: 'mail@acme-corp.com',
    }),
  })
  .openapi('Customer');
export type CustomerDto = z.infer<typeof CustomerDtoSchema>;
