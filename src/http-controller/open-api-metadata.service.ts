import { ResponseConfig, RouteConfig, ZodRequestBody } from '@asteasolutions/zod-to-openapi';
import { injectable } from 'inversify';
import { optionalStringSchema, stringSchema } from 'shared';
import { z, ZodArray, ZodRawShape, ZodType } from 'zod';
import {
  ControllerMetadata,
  ControllerOperationMetadata,
  OperationQueryArgMetadata,
  QueryItemType,
} from './decorators';

type RouteConfigRequest = RouteConfig['request'];

type Responses = Record<string, ResponseConfig>;

@injectable()
export class OpenApiMetadataService {
  getTags(
    controllerMetadata: ControllerMetadata,
    operationMetadata: ControllerOperationMetadata,
  ): string[] | undefined {
    const tags = [...new Set([...(controllerMetadata.tags ?? []), ...(operationMetadata.tags ?? [])])];
    return tags.length ? tags : undefined;
  }

  getRequest(operationMetadata: ControllerOperationMetadata): RouteConfigRequest {
    const paramsShape: ZodRawShape = {};
    const headersShape: ZodRawShape = {};
    const queriesShape: ZodRawShape = {};
    let requestBody: ZodRequestBody | undefined = undefined;
    operationMetadata.args.forEach(arg => {
      switch (arg.type) {
        case 'path':
          paramsShape[arg.name] = arg.schema ?? stringSchema;
          break;
        case 'header':
          headersShape[arg.name] = arg.schema ?? optionalStringSchema;
          break;
        case 'query':
          queriesShape[arg.name] = OpenApiMetadataService.getQueryType(arg);
          break;
        case 'body':
          requestBody = {
            description: arg.description,
            content: {
              ['application/json']: {
                example: arg.example,
                schema: arg.schema,
              },
            },
          };
          break;
        case 'undefined':
        case 'request':
        case 'user':
        case 'context':
          break;
      }
    });

    return {
      params: z.object(paramsShape),
      headers: z.object(headersShape),
      query: z.object(queriesShape),
      body: requestBody,
    };
  }

  getResponse(operationMetadata: ControllerOperationMetadata): Responses {
    const responses = {
      ...(operationMetadata.responses ?? {}),
    };
    const directResponse = operationMetadata.response;
    if (directResponse) {
      const customStatus = directResponse.status ?? 200;
      responses[customStatus] = {
        description: directResponse.description,
        content: directResponse.contentSchema
          ? {
              ['application/json']: {
                schema: directResponse.contentSchema,
              },
            }
          : undefined,
      };
    }
    return Object.getOwnPropertyNames(responses).length
      ? responses
      : {
          '204': { description: 'Default no content' },
        };
  }

  private static getQueryType(arg: OperationQueryArgMetadata): ZodType<QueryItemType> {
    let querySchema = arg.schema;
    if (querySchema instanceof ZodArray) {
      querySchema = querySchema.optional();
    }
    return querySchema ?? optionalStringSchema;
  }
}
