import * as z from 'zod';
import { parseWithZod, ZodParserError } from './zod-parser-wrapper';

describe('parseWithZod', () => {
  const testSchema = z.object({
    name: z.string(),
    age: z.number().int().positive(),
    ['object Field']: z.object({
      nestedField: z.string(),
    }),
    arrayField: z.array(z.string()).optional(),
  });

  it('should return the parsed object if the input is valid', () => {
    const input = {
      name: 'Alice',
      age: 30,
      ['object Field']: { nestedField: 'value' },
      arrayField: ['item1', 'item2'],
    };

    const result = parseWithZod(testSchema, input);

    expect(result).toEqual(input);
  });

  it('should throw a ZodParserError with a detailed Message if the input is invalid', () => {
    const input = { name: 'Bob', age: -5, ['object Field']: {} }; // missing objectField and age is negative

    expect(() => parseWithZod(testSchema, input)).toThrowWithMessage(
      ZodParserError,
      `Error parsing data:
✖ Too small: expected number to be >0
  → at age
✖ Invalid input: expected string, received undefined
  → at ["object Field"].nestedField`,
    );
  });

  it('should include multiple issues in the error Message but not more than 10', () => {
    const input = {
      name: 123, // invalid type
      age: -5, // invalid value
      arrayField: [1, 2, '3', 4, 5, 6, 7, 8, 9, 10, 11], // invalid type and too many items
    };

    expect(() => parseWithZod(testSchema, input)).toThrowWithMessage(
      ZodParserError,
      `Error parsing data:
✖ Invalid input: expected string, received number
  → at name
✖ Too small: expected number to be >0
  → at age
✖ Invalid input: expected object, received undefined
  → at ["object Field"]
✖ Invalid input: expected string, received number
  → at arrayField[0]
✖ Invalid input: expected string, received number
  → at arrayField[1]
... and 8 more issues`,
    );
  });
});
