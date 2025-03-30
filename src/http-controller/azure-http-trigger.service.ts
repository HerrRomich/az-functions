import { HttpResponseInit, InvocationContext } from '@azure/functions';
import { StatusCodes } from 'http-status-codes';
import { injectable } from 'inversify';
import { optionalStringSchema, stringSchema, zodTypeName } from 'shared';
import {
  z,
  ZodArrayDef,
  ZodError,
  ZodFirstPartyTypeKind,
  ZodNullableDef,
  ZodOptionalDef,
  ZodPipeline,
  ZodType,
} from 'zod';
import { fromError, fromZodError } from 'zod-validation-error';
import {
  ControllerOperationMetadata,
  OperationPathArgMetadata,
  OperationQueryArgMetadata,
  QueryItemType,
} from './decorators';
import {
  AsyncHttpRequestArgsProvider,
  AsyncHttpRequestProvider,
  AsyncHttpRequestProviderInput,
} from './http-controller-platform.model';
import { BadRequestError, HttpTriggerError } from './http-controller.model';

class ArgParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArgParseError';
    Object.setPrototypeOf(this, ArgParseError.prototype);
  }
}

@injectable()
export class AzureHttpTriggerService {
  async handleHttpRequest(
    context: InvocationContext,
    operationMetadata: ControllerOperationMetadata,
    method: () => Promise<unknown>,
  ): Promise<HttpResponseInit> {
    try {
      const directResponse = operationMetadata.response;
      const result = await method();
      if (directResponse) {
        return {
          status: directResponse.status ?? 200,
          jsonBody: directResponse.contentSchema?.parse(result) ?? result,
        };
      } else {
        return result as HttpResponseInit;
      }
    } catch (e) {
      if (e instanceof HttpTriggerError) {
        context.error(e.stack);
        return e.response;
      } else {
        if (e instanceof ZodError) {
          const validationError = fromZodError(e);
          context.error(
            `Response validation error.
${validationError.stack}`,
          );
        } else if (e instanceof Error) {
          context.error(e.stack);
        } else {
          context.error(`Internal error: ${String(e)}`);
        }
        return {
          status: StatusCodes.INTERNAL_SERVER_ERROR,
          body: 'Internal error is thrown during request.',
        };
      }
    }
  }

  buildArgProviders(operationMetadata: ControllerOperationMetadata): AsyncHttpRequestArgsProvider {
    const argProviders: AsyncHttpRequestProvider[] = [];
    operationMetadata.args.forEach(arg => {
      switch (arg.type) {
        case 'path': {
          argProviders.push(this.getPathParamProvider(arg));
          break;
        }
        case 'header': {
          const headerSchema = arg.schema ?? optionalStringSchema;
          const headerItemName = arg.name;
          argProviders.push(this.getHeaderProvider(headerItemName, headerSchema));
          break;
        }
        case 'query': {
          argProviders.push(this.getQueryItemProvider(arg));
          break;
        }
        case 'request':
          argProviders.push(({ request }) => request);
          break;
        case 'context':
          argProviders.push(({ context }) => context);
          break;
        case 'user':
          argProviders.push(({ userAccount }) => userAccount);
          break;
        case 'body':
          argProviders.push(this.getBodyProvider(arg.schema));
          break;
        case 'undefined':
          argProviders.push(() => undefined);
          break;
      }
    });
    return this.getArgsProvider(argProviders);
  }

  private getArgsProvider(argProviders: AsyncHttpRequestProvider[]): AsyncHttpRequestArgsProvider {
    return async (request, context, userAccount) => {
      /* There is a Bug in request.query
         new URL(request.url).searchParams will be used instead for query parameters,
       */
      const queryItems = new URL(request.url).searchParams;
      const args = await Promise.allSettled(
        argProviders.map(argProvider => {
          const asyncArgProvider = async () => argProvider({ request, context, userAccount, queryItems });
          return asyncArgProvider();
        }),
      ).then(results => {
        const splittedResults = results.reduce(
          (aggregator, currentValue) => {
            if (currentValue.status === 'fulfilled') {
              aggregator.fulfilled.push(currentValue.value);
            } else {
              aggregator.rejected.push(currentValue.reason);
            }
            return aggregator;
          },
          { fulfilled: Array<unknown>(), rejected: Array(0) },
        );
        if (splittedResults.rejected.length === 0) {
          return splittedResults.fulfilled;
        } else {
          const message = splittedResults.rejected.map(reason => reason.message ?? String(reason)).join('\n\n');
          throw new BadRequestError(message);
        }
      });
      return args;
    };
  }

  private getBodyProvider<T>(bodySchema: ZodType<T>): (input: AsyncHttpRequestProviderInput) => Promise<T> {
    return async ({ request }): Promise<T> => {
      try {
        const data = await request.json();
        return bodySchema.parse(data);
      } catch (e) {
        if (e instanceof ZodError) {
          throw new ArgParseError(
            `Error parsing request body:
${fromZodError(e).message}`,
          );
        } else {
          throw e;
        }
      }
    };
  }

  private getPathParamProvider(
    arg: OperationPathArgMetadata,
  ): (input: AsyncHttpRequestProviderInput) => string | number {
    const paramSchema = arg.schema ?? stringSchema;
    const coercePathParamSchema = this.getCoercedSchema(paramSchema);
    const pathParamName = arg.name;
    return ({ request }) => {
      const pathParam = request.params[pathParamName];
      try {
        return coercePathParamSchema.parse(pathParam);
      } catch (e) {
        throw new ArgParseError(
          `Error parsing path parameter=${pathParamName}:
${fromError(e).message}`,
        );
      }
    };
  }

  private getHeaderProvider(
    headerItemName: string,
    headerSchema: ZodType<string | undefined>,
  ): (input: AsyncHttpRequestProviderInput) => string | undefined {
    return ({ request }): string | undefined => {
      const headerElöement = request.headers.get(headerItemName) ?? undefined;
      try {
        return headerSchema.parse(headerElöement);
      } catch (e) {
        throw new ArgParseError(
          `Error parsing header item=${headerItemName}:
${fromError(e).message}`,
        );
      }
    };
  }

  private getQueryItemProvider(
    arg: OperationQueryArgMetadata,
  ): (input: AsyncHttpRequestProviderInput) => QueryItemType {
    const querySchema = arg.schema ?? optionalStringSchema;
    const isArray = zodTypeName(querySchema) === ZodFirstPartyTypeKind.ZodArray;
    const coercedQuerySchema = this.getCoercedSchema(querySchema, isArray);
    const queryItemName = arg.name;
    return ({ queryItems }): QueryItemType => {
      let queryItemValue: unknown;
      if (isArray) {
        queryItemValue = queryItems.getAll(queryItemName);
      } else {
        queryItemValue = queryItems.get(queryItemName) ?? undefined;
      }
      try {
        return coercedQuerySchema.parse(queryItemValue);
      } catch (e) {
        throw new ArgParseError(
          `Error parsing query item=${queryItemName}:
${fromError(e).message}`,
        );
      }
    };
  }

  private getCoercedSchema<T extends ZodType>(schema: T, isArray = false): ZodPipeline<ZodType, T> {
    let singleSchema = isArray ? (schema._def as ZodArrayDef).type : schema;
    singleSchema =
      zodTypeName(singleSchema) === ZodFirstPartyTypeKind.ZodOptional
        ? (singleSchema._def as ZodOptionalDef).innerType
        : singleSchema;
    singleSchema =
      zodTypeName(singleSchema) === ZodFirstPartyTypeKind.ZodNullable
        ? (singleSchema._def as ZodNullableDef).innerType
        : singleSchema;
    const singleTypeName = zodTypeName(singleSchema);
    let coercedSchema = this.getCoercedSingleSchema(singleTypeName);
    if (isArray) {
      coercedSchema = coercedSchema.array();
    }
    return coercedSchema.pipe(schema);
  }

  private getCoercedSingleSchema(singleTypeName: ZodFirstPartyTypeKind): ZodType {
    return z
      .string()
      .optional()
      .transform(val => {
        if (singleTypeName === ZodFirstPartyTypeKind.ZodBoolean) {
          {
            if (val === 'true') {
              return true;
            } else if (val === 'false') {
              return false;
            } else {
              return val;
            }
          }
        } else if (singleTypeName === ZodFirstPartyTypeKind.ZodNumber) {
          {
            const numVal = Number(val).valueOf();
            return Number.isNaN(numVal) ? val : numVal;
          }
        } else {
          return val;
        }
      });
  }
}
