import { HttpFunctionOptions } from '@azure/functions';
import { OperationObject, SecurityRequirementObject } from 'openapi3-ts/oas30';
import { CommonArgMetadata } from 'shared';
import { ZodType } from 'zod';

export const HTTP_OPERATION_METADATA_KEY = Symbol.for('metadata:http-operation');

export interface ControllerConfig {
  application?: string;
  path: string;
  tags?: string[];
}

export interface ControllerMetadata extends ControllerConfig {
  type: 'http-controller';
}

export type ControllerOperationConfig = Pick<
  OperationObject,
  'operationId' | 'description' | 'summary' | 'tags' | 'parameters'
> &
  Partial<Pick<OperationObject, 'responses'>> & {
    path?: string;
    security?: SecurityRequirementObject[];
    response?: {
      status?: number;
      description: string;
      contentSchema?: ZodType<unknown>;
    };
    permissions?: string[];
  } & Pick<HttpFunctionOptions, 'authLevel' | 'extraInputs' | 'extraOutputs'>;

export interface ControllerRequest {
  required?: boolean;
  description?: string;
  schema: ZodType<unknown>;
  example?: unknown;
}

export type ControllerRequestBodyOperationConfig = ControllerOperationConfig & Pick<OperationObject, 'requestBody'>;

export type ControllerOperationCommonArgMetadata =
  | {
      type: 'request' | 'user';
    }
  | CommonArgMetadata;

export type PathSchema = ZodType<string | number>;

export interface OperationPathArgMetadata {
  type: 'path';
  name: string;
  schema?: PathSchema;
}

export interface OperationHeaderArgMetadata {
  type: 'header';
  name: string;
  schema?: ZodType<string | undefined>;
}

export type QueryItemType = string | number | boolean | string[] | number[] | undefined;
export type QueryItemSchema = ZodType<QueryItemType>;

export interface OperationQueryArgMetadata {
  type: 'query';
  name: string;
  schema?: QueryItemSchema;
}

export interface OperationBodyArgMetadata extends ControllerRequest {
  type: 'body';
}

export type OperationArgMetadata =
  | ControllerOperationCommonArgMetadata
  | OperationPathArgMetadata
  | OperationHeaderArgMetadata
  | OperationQueryArgMetadata
  | OperationBodyArgMetadata;

export interface ControllerOperationArgsMetadata {
  args: OperationArgMetadata[];
}

export type ControllerOperationBaseMetadata =
  | (ControllerOperationConfig & {
      method: 'get' | 'head' | 'delete';
    })
  | (ControllerRequestBodyOperationConfig & {
      method: 'post' | 'put' | 'patch';
    });

export type ControllerOperationMetadata = ControllerOperationBaseMetadata & ControllerOperationArgsMetadata;

export type OperationMethod = ControllerOperationMetadata['method'];
