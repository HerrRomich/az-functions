import { z, ZodArray, ZodNumber, ZodObject } from 'zod';

export const IdDtoSchema = z.int().min(1).openapi('id');

export function provideListResponseDtoSchema<T extends z.ZodTypeAny>(
  dataSchema: T,
): ZodObject<{
  items: ZodArray<T>;
  totalCount: ZodNumber;
}> {
  return z.object({
    items: z.array(dataSchema).openapi({
      description: 'The list of items for the current page',
    }),
    totalCount: z.number().min(0).openapi({
      description: 'The total number of items available',
      example: 42,
    }),
  });
}
