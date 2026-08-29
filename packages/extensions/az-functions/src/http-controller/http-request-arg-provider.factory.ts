import { injectable } from 'inversify';
import * as _ from 'lodash';
import { HandlerArgsParseError, parseWithZod, ZodParserError } from 'shared';
import { z, ZodArray, ZodPipe, ZodType } from 'zod';
import { ControllerOperationPathArgMetadata, ControllerOperationQueryArgMetadata, QueryItemType } from './decorators';
import { BadRequestError, OptionalStringSchema, StringSchema } from './http-controller.model';
import { HttpRequestArgProvider, HttpRequestArgsProvider } from './http-handler-support.factory';

@injectable()
export class HttpRequestArgProviderFactory {
  createBodyArgProvider<T>(bodySchema: ZodType<T>): HttpRequestArgProvider {
    return async ({ request }): Promise<T> => {
      try {
        const data = await request.json();
        return parseWithZod(bodySchema, data);
      } catch (e) {
        if (e instanceof ZodParserError) {
          throw new HandlerArgsParseError('Failed parsing request body', {
            cause: e,
          });
        } else {
          throw e;
        }
      }
    };
  }

  createPathParamArgProvider(arg: ControllerOperationPathArgMetadata): HttpRequestArgProvider {
    const paramSchema = arg.schema ?? StringSchema;
    const coercePathParamSchema = this.getCoercedSchema(paramSchema);
    const pathParamName = arg.name;
    return ({ request }): string | number => {
      const pathParam = request.params[pathParamName];
      try {
        return parseWithZod(coercePathParamSchema, pathParam);
      } catch (e) {
        throw new HandlerArgsParseError(`Failed parsing path parameter ${pathParamName}`, {
          cause: e,
          details: {
            pathParam: {
              name: pathParamName,
              value: pathParam,
            },
          },
        });
      }
    };
  }

  createHeaderProvider(headerItemName: string, headerSchema: ZodType<string | undefined>): HttpRequestArgProvider {
    return ({ request }): string | undefined => {
      const headerElement = request.headers.get(headerItemName) ?? undefined;
      try {
        return parseWithZod(headerSchema, headerElement);
      } catch (e) {
        throw new HandlerArgsParseError(`Failed parsing header parameter ${headerItemName}`, {
          cause: e,
          details: {
            header: {
              name: headerItemName,
              value: headerElement,
            },
          },
        });
      }
    };
  }

  createQueryItemArgProvider(arg: ControllerOperationQueryArgMetadata): HttpRequestArgProvider {
    const querySchema = arg.schema ?? OptionalStringSchema;
    const isArray = querySchema instanceof ZodArray;
    const coercedQuerySchema = this.getCoercedSchema(querySchema);
    const queryItemName = arg.name;
    return ({ request }): QueryItemType => {
      /* There is a Bug in request.query
         new URL(request.url).searchParams will be used instead for query parameters,
       */
      const queryItems = new URL(request.url).searchParams;
      let queryItemValue: unknown;
      if (isArray) {
        queryItemValue = queryItems.getAll(queryItemName);
      } else {
        queryItemValue = queryItems.get(queryItemName) ?? undefined;
      }
      try {
        return parseWithZod(coercedQuerySchema, queryItemValue);
      } catch (e) {
        throw new HandlerArgsParseError(`Failed parsing query parameter ${queryItemName}`, {
          cause: e,
          details: {
            query: {
              name: queryItemName,
              value: queryItemValue,
            },
          },
        });
      }
    };
  }

  private getCoercedSchema<T extends ZodType>(schema: T): ZodPipe<ZodType, T> {
    let isArray: boolean;
    let singleSchema: ZodType;
    if (schema instanceof ZodArray) {
      singleSchema = schema.unwrap() as ZodType;
      isArray = true;
    } else {
      isArray = false;
      singleSchema = schema;
    }
    let coercedSchema = this.getCoercedSingleSchema(singleSchema);
    if (isArray) {
      coercedSchema = coercedSchema.array();
    }
    return coercedSchema.pipe(schema);
  }

  private getCoercedSingleSchema(singleType: ZodType): ZodType {
    return z
      .string()
      .optional()
      .transform(val => {
        const singleTypeName = singleType.type;
        if (singleTypeName === 'boolean') {
          if (val === 'true') {
            return true;
          } else if (val === 'false') {
            return false;
          } else {
            return val;
          }
        } else if (singleTypeName === 'number') {
          const numVal = Number(val).valueOf();
          return Number.isNaN(numVal) ? val : numVal;
        } else {
          return val;
        }
      });
  }

  createArgsProvider(argProviders: HttpRequestArgProvider[]): HttpRequestArgsProvider {
    return async (requestInput): Promise<unknown[]> => {
      const parsingResults = await Promise.allSettled(
        argProviders.map(
          argProvider =>
            new Promise((resolve, reject) => {
              try {
                resolve(argProvider(requestInput));
              } catch (e) {
                reject(e);
              }
            }),
        ),
      );
      const [fulfilled, rejected] = _.partition(parsingResults, result => result.status === 'fulfilled');
      if (rejected.length > 0) {
        const errors = rejected.map(({ reason }) => reason);
        throw new BadRequestError('Failed parsing request arguments', {
          details: { errors: errors },
        });
      }
      return fulfilled.map(({ value }) => value);
    };
  }
}
