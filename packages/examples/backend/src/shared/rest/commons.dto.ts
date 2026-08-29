import { util, z, ZodArray, ZodNumber, ZodObject } from 'zod';

export const IdDtoSchema = z.uuidv7();

const ResponsePageDtoSchema = z
  .object({
    offset: z.number().min(0).openapi({
      description: 'The offset of the current page',
      example: 0,
    }),
    count: z.number().min(0).openapi({
      description: 'The number of items returned in the current page',
      example: 10,
    }),
    total: z.number().min(0).openapi({
      description: 'The total number of items available',
      example: 42,
    }),
  })
  .openapi('ResponsePage');

export function provideListResponseDtoSchema<T extends z.ZodTypeAny>(
  dataSchema: T,
): ZodObject<{
  items: ZodArray<T>;
  offset: ZodNumber;
  count: ZodNumber;
  total: ZodNumber;
}> {
  const zodObject: ZodObject<util.Extend<typeof ResponsePageDtoSchema.shape, { items: ZodArray<T> }>> =
    ResponsePageDtoSchema.extend({
      items: z.array(dataSchema).openapi({
        description: 'The list of items for the current page',
      }),
    });
  return zodObject;
}
