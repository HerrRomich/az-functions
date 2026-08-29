import { ResponseConfig, RouteConfig, ZodRequestBody } from '@asteasolutions/zod-to-openapi';
import { injectable } from 'inversify';
import { z, ZodArray, ZodType } from 'zod';
import {
  ControllerOperationMetadata,
  ControllerOperationQueryArgMetadata,
  HttpControllerMetadata,
  QueryItemType,
} from './decorators';
import { OptionalStringSchema, StringSchema } from './http-controller.model';

type RouteConfigRequest = RouteConfig['request'];

type Responses = Record<string, ResponseConfig>;

@injectable()
export class OpenApiMetadataService {
  getTags(
    controllerMetadata: HttpControllerMetadata,
    operationMetadata: ControllerOperationMetadata,
  ): string[] | undefined {
    const tags = [...new Set([...(controllerMetadata.tags ?? []), ...(operationMetadata.tags ?? [])])];
    return tags.length ? tags : undefined;
  }

  getRequest(operationMetadata: ControllerOperationMetadata): RouteConfigRequest {
    const paramsShape: Record<string, ZodType> = {};
    const headersShape: Record<string, ZodType> = {};
    const queriesShape: Record<string, ZodType> = {};
    let requestBody: ZodRequestBody | undefined = undefined;
    for (const arg of operationMetadata.args) {
      switch (arg.type) {
        case 'path':
          paramsShape[arg.name] = arg.schema ?? StringSchema;
          break;
        case 'header':
          headersShape[arg.name] = arg.schema ?? OptionalStringSchema;
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
        case 'authContext':
        case 'invocationContext':
          break;
      }
    }

    return {
      params: z.object(paramsShape),
      headers: z.object(headersShape),
      query: z.object(queriesShape),
      body: requestBody,
    };
  }

  getResponses(operationMetadata: ControllerOperationMetadata): Responses {
    const responses = { ...operationMetadata.responses };
    const directResponse = operationMetadata.directResponse;
    if (directResponse) {
      const customStatus = directResponse.status ?? 200;
      responses[customStatus] = {
        description: directResponse.description,
        content: directResponse.jsonContent ? { ['application/json']: directResponse.jsonContent } : undefined,
        headers: directResponse.headers,
      };
    }
    return Object.getOwnPropertyNames(responses).length
      ? responses
      : {
          '204': {
            description: 'Default no jsonContent',
          },
        };
  }

  private static getQueryType(arg: ControllerOperationQueryArgMetadata): ZodType<QueryItemType> {
    let querySchema = arg.schema;
    if (querySchema instanceof ZodArray) {
      querySchema = (querySchema as ZodType<string[] | number[]>).optional();
    }
    return querySchema ?? OptionalStringSchema;
  }
}
