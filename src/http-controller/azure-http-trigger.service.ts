import { HttpResponseInit, InvocationContext } from '@azure/functions';
import { StatusCodes } from 'http-status-codes';
import { injectable } from 'inversify';
import { AzureFunctionError, errorToString } from 'shared';
import { z, ZodArray, ZodError, ZodOptional, ZodPipe, ZodType } from 'zod';
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
import { BadRequestError, HttpTriggerError, optionalStringSchema, stringSchema } from './http-controller.model';

class ArgParseError extends AzureFunctionError {}

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
          context.error(
            `Response validation error.
${z.prettifyError(e)}
${e.stack}`,
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
    for (const arg of operationMetadata.args) {
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
    }
    return this.getArgsProvider(argProviders);
  }

  private getArgsProvider(argProviders: AsyncHttpRequestProvider[]): AsyncHttpRequestArgsProvider {
    return async (request, context, userAccount): Promise<unknown[]> => {
      /* There is a Bug in request.query
         new URL(request.url).searchParams will be used instead for query parameters,
       */
      const queryItems = new URL(request.url).searchParams;

      return await Promise.allSettled(
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
          { fulfilled: new Array<unknown>(), rejected: new Array(0) },
        );
        if (splittedResults.rejected.length === 0) {
          return splittedResults.fulfilled;
        } else {
          const message = splittedResults.rejected.map(reason => errorToString(reason)).join('\n\n');
          throw new BadRequestError(message);
        }
      });
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
${z.prettifyError(e)}`,
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
        /* istanbul ignore else */
        if (e instanceof ZodError) {
          throw new ArgParseError(
            `Error parsing path parameter=${pathParamName}:
${z.prettifyError(e)}`,
          );
        } else {
          throw e;
        }
      }
    };
  }

  private getHeaderProvider(
    headerItemName: string,
    headerSchema: ZodType<string | undefined>,
  ): (input: AsyncHttpRequestProviderInput) => string | undefined {
    return ({ request }): string | undefined => {
      const headerElement = request.headers.get(headerItemName) ?? undefined;
      try {
        return headerSchema.parse(headerElement);
      } catch (e) {
        /* istanbul ignore else */
        if (e instanceof ZodError) {
          throw new ArgParseError(
            `Error parsing header item=${headerItemName}:
${z.prettifyError(e)}`,
          );
        } else {
          throw e;
        }
      }
    };
  }

  private getQueryItemProvider(
    arg: OperationQueryArgMetadata,
  ): (input: AsyncHttpRequestProviderInput) => QueryItemType {
    const querySchema = arg.schema ?? optionalStringSchema;
    const isArray = querySchema instanceof ZodArray;
    const coercedQuerySchema = this.getCoercedSchema(querySchema);
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
        /* istanbul ignore else */
        if (e instanceof ZodError) {
          throw new ArgParseError(
            `Error parsing query item=${queryItemName}:
${z.prettifyError(e)}`,
          );
        } else {
          throw e;
        }
      }
    };
  }

  private getCoercedSchema<T extends ZodType>(schema: T): ZodPipe<ZodType, T> {
    const isArray = schema instanceof ZodArray;
    let singleSchema = isArray ? (schema.unwrap() as ZodType) : schema;
    singleSchema =
      singleSchema.type === 'optional' ? ((singleSchema as ZodOptional).unwrap() as ZodType) : singleSchema;
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
}
