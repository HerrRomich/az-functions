import { ResponseConfig, ZodMediaTypeObject } from '@asteasolutions/zod-to-openapi';
import { HttpFunctionOptions } from '@azure/functions';
import { HeadersObject, OperationObject } from 'openapi3-ts/oas30';
import { CommonArgMetadata, TriggerHandlerClassMetadata } from 'shared';
import { _ZodString, ZodObject, ZodType } from 'zod';

/**
 * ControllerConfig defines the configuration for an HTTP controller.
 * - `application`: Optional string representing the application name. Name should be reference to a registered application in the platform.
 * if not provided, the controller will be registered under the default application.
 * - `path`: Required string representing the base path for the controller, relative to the application base path.
 * This path will be prefixed to all operation paths defined in the controller.
 * - `tags`: Optional array of strings representing tags for the controller.
 */
export interface ControllerConfig {
  application?: string;
  path: string;
  tags?: string[];
}

export const HTTP_CONTROLLER_TYPE = 'http-controller';

export interface HttpControllerMetadata extends TriggerHandlerClassMetadata, ControllerConfig {
  type: typeof HTTP_CONTROLLER_TYPE;
}

/**
 * DirectResponseObject defines the structure for a direct response in an HTTP controller operation.
 * - `status`: Optional number representing the HTTP status code for the response. Defaults to 200 if not provided.
 * - `description`: Required string providing a description of the response.
 * - `jsonContent`: Optional ZodMediaTypeObject defining the JSON content schema for the response body.
 * - `headers`: Optional object defining the headers for the response. Can be either a ZodObject or a HeadersObject.
 */
export interface DirectResponseObject {
  status?: number;
  description: string;
  jsonContent?: ZodMediaTypeObject;
  headers?: ZodObject<Record<string, _ZodString>> | HeadersObject;
}

/**
 * ControllerOperationConfig defines the configuration for an HTTP controller operation.
 * - `operationId`: Optional string representing the unique identifier for the operation.
 * - `description`: Optional string providing a description of the operation.
 * - `summary`: Optional string providing a summary of the operation.
 * - `tags`: Optional array of strings representing tags for the operation.
 * - `parameters`: Optional array of parameters for the operation, as defined in the OpenAPI specification.
 * - `security`: Optional array defining the security requirements for the operation, as defined in the OpenAPI specification.
 * - `path`: Optional string representing the path for the operation, relative to the controller's base path.
 * - `directResponse`: Optional DirectResponseObject defining a direct response for the operation.
 * - `responses`: Optional record mapping HTTP status codes to ResponseConfig objects, defining the responses for the operation.
 * - `authLevel`: Optional string defining the authentication level required for the operation, as defined in the Azure Functions HttpFunctionOptions.
 * - `extraInputs`: Optional array of extra input bindings for the operation, as defined in the Azure Functions HttpFunctionOptions.
 * - `extraOutputs`: Optional array of extra output bindings for the operation, as defined in the Azure Functions HttpFunctionOptions.
 */
export type ControllerOperationConfig = Pick<
  OperationObject,
  'operationId' | 'description' | 'summary' | 'tags' | 'parameters' | 'security'
> &
  Partial<Pick<OperationObject, 'responses'>> & {
    path?: string;
    directResponse?: DirectResponseObject;
    responses?: Record<string, ResponseConfig>;
  } & Pick<HttpFunctionOptions, 'authLevel' | 'extraInputs' | 'extraOutputs'>;

/**
 * ControllerRequest defines the structure for a request body in an HTTP controller operation.
 * - `required`: Optional boolean indicating whether the request body is required. Defaults to false if not provided.
 * - `description`: Optional string providing a description of the request body.
 * - `schema`: Required ZodType defining the schema for the request body.
 * - `example`: Optional example value for the request body, which can be of any type.
 */
export interface ControllerRequest {
  required?: boolean;
  description?: string;
  schema: ZodType<unknown>;
  example?: unknown;
}

/**
 * ControllerRequestBodyOperationConfig defines the configuration for an HTTP controller operation that includes a request body.
 * It extends the ControllerOperationConfig and includes the 'requestBody' property from the OpenAPI OperationObject.
 * - `operationId`: Optional string representing the unique identifier for the operation.
 * - `description`: Optional string providing a description of the operation.
 * - `summary`: Optional string providing a summary of the operation.
 * - `tags`: Optional array of strings representing tags for the operation.
 * - `parameters`: Optional array of parameters for the operation, as defined in the OpenAPI specification.
 * - `security`: Optional array defining the security requirements for the operation, as defined in the OpenAPI specification.
 * - `path`: Optional string representing the path for the operation, relative to the controller's base path.
 * - `directResponse`: Optional DirectResponseObject defining a direct response for the operation.
 * - `responses`: Optional record mapping HTTP status codes to ResponseConfig objects, defining the responses for the operation.
 * - `authLevel`: Optional string defining the authentication level required for the operation, as defined in the Azure Functions HttpFunctionOptions.
 * - `extraInputs`: Optional array of extra input bindings for the operation, as defined in the Azure Functions HttpFunctionOptions.
 * - `extraOutputs`: Optional array of extra output bindings for the operation, as defined in the Azure Functions HttpFunctionOptions.
 * - `requestBody`: Optional property from the OpenAPI OperationObject defining the request body for the operation.
 */
export type ControllerRequestBodyOperationConfig = ControllerOperationConfig & Pick<OperationObject, 'requestBody'>;

export type ControllerOperationCommonArgMetadata =
  | {
      type: 'request' | 'authContext';
    }
  | CommonArgMetadata;

export type PathSchema = ZodType<string | number>;

export interface ControllerOperationPathArgMetadata {
  type: 'path';
  name: string;
  schema?: PathSchema;
}

export interface ControllerOperationHeaderArgMetadata {
  type: 'header';
  name: string;
  schema?: ZodType<string | undefined>;
}

export type QueryItemType = string | number | boolean | string[] | number[] | undefined;
export type QueryItemSchema = ZodType<QueryItemType>;

export interface ControllerOperationQueryArgMetadata {
  type: 'query';
  name: string;
  schema?: QueryItemSchema;
}

export interface ControllerOperationBodyArgMetadata extends ControllerRequest {
  type: 'body';
}

export type ControllerOperationArgMetadata =
  | ControllerOperationCommonArgMetadata
  | ControllerOperationPathArgMetadata
  | ControllerOperationHeaderArgMetadata
  | ControllerOperationQueryArgMetadata
  | ControllerOperationBodyArgMetadata;

export interface ControllerOperationArgsMetadata {
  args: ControllerOperationArgMetadata[];
}

export type ControllerOperationBaseMetadata =
  | (ControllerOperationConfig & {
      method: 'get' | 'head' | 'delete';
    })
  | (ControllerRequestBodyOperationConfig & {
      method: 'post' | 'put' | 'patch';
    });

export type ControllerOperationMetadata = {
  type: typeof HTTP_CONTROLLER_TYPE;
} & ControllerOperationBaseMetadata &
  ControllerOperationArgsMetadata;

export type OperationMethod = ControllerOperationMetadata['method'];
