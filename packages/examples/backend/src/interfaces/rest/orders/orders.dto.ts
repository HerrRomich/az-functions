import { GeoJSONPointSchema, IdDtoSchema, provideListResponseDtoSchema } from '@fleet-sight/shared/rest';
import { z } from 'zod';

export const OrderStatusScheme = z.enum(['scheduled', 'in_transit', 'loaded', 'delivered']).openapi('orderStatus', {
  description: 'Status of the order',
});
export type OrderStatus = z.infer<typeof OrderStatusScheme>;

export const OrderDtoSchema = z
  .object({
    id: IdDtoSchema.openapi({ description: 'Unique identifier of the order' }),
    customer: z
      .object({
        id: IdDtoSchema.openapi({ description: 'Unique identifier of the customer' }),
        name: z.string().openapi({ description: 'Name of the customer' }),
      })
      .openapi({ description: 'Customer information' }),
    orderDate: z.iso.datetime({ offset: true }).openapi({ description: 'Date of the order in ISO format' }),
    scheduledAt: z.iso.datetime({ offset: true }).openapi({ description: 'Scheduled date of the order in ISO format' }),
    status: OrderStatusScheme.openapi({ description: 'Status of the order' }),
    sourceAddress: z.string().openapi({ description: 'Source address of the order' }),
    sourcePoint: GeoJSONPointSchema.openapi({ description: 'Source location of the order' }),
    destinationAddress: z.string().openapi({ description: 'Destination address of the order' }),
    destinationPoint: GeoJSONPointSchema.openapi({ description: 'Destination location of the order' }),
    weight: z.number().nonnegative().openapi({ description: 'Weight of the order in kilograms' }),
    volume: z.number().nonnegative().openapi({ description: 'Volume of the order in cubic meters' }),
  })
  .openapi('Order');
export type OrderDto = z.infer<typeof OrderDtoSchema>;

export const OrdersResponseSchema = provideListResponseDtoSchema(OrderDtoSchema);
export type OrdersResponse = z.infer<typeof OrdersResponseSchema>;

export const OrderCreateRequestDtoSchema = z.object({
  customerId: IdDtoSchema.openapi({ description: 'Unique identifier of the customer' }),
  scheduledAt: z.iso
    .datetime({ offset: true })
    .optional()
    .openapi({ description: 'Scheduled date of the order in ISO format' }),
  sourceAddress: z.string().openapi({ description: 'Source address of the order' }),
  sourcePoint: GeoJSONPointSchema.openapi({ description: 'Source location of the order' }),
  destinationAddress: z.string().openapi({ description: 'Destination address of the order' }),
  destinationPoint: GeoJSONPointSchema.openapi({ description: 'Destination location of the order' }),
  weight: z.number().nonnegative().openapi({ description: 'Weight of the order in kilograms' }),
  volume: z.number().nonnegative().openapi({ description: 'Volume of the order in cubic meters' }),
});
export type OrderCreateRequestDto = z.infer<typeof OrderCreateRequestDtoSchema>;
