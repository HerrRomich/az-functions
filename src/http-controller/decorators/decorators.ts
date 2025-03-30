import { HttpRequest } from '@azure/functions';
import { decorate, injectable } from 'inversify';
import * as shared from 'shared';
import { adjustMetadata, AZURE_FUNCTION_METADATA_KEY, AzureFunctions } from 'shared';
import { ZodType } from 'zod';
import {
  ControllerConfig,
  ControllerMetadata,
  ControllerOperationArgsMetadata,
  ControllerOperationBaseMetadata,
  ControllerOperationCommonArgMetadata,
  ControllerOperationConfig,
  ControllerOperationMetadata,
  ControllerRequest,
  ControllerRequestBodyOperationConfig,
  HTTP_OPERATION_METADATA_KEY,
  OperationArgMetadata,
  PathSchema,
  QueryItemSchema,
} from './decorators.model';

export function controller(config: ControllerConfig) {
  return function <T extends AzureFunctions>(target: T) {
    const metadata: ControllerMetadata = {
      type: 'http-controller',
      ...config,
    };
    Reflect.defineMetadata(AZURE_FUNCTION_METADATA_KEY, metadata, target);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    decorate(injectable(), target as Function);
  };
}

export function get(operationConfig?: ControllerOperationConfig) {
  return provideControllerOperationDecorator({ method: 'get', ...operationConfig });
}

export function head(operationConfig?: ControllerOperationConfig) {
  return provideControllerOperationDecorator({ method: 'head', ...operationConfig });
}

export function _delete(operationConfig?: ControllerOperationConfig) {
  return provideControllerOperationDecorator({ method: 'delete', ...operationConfig });
}

export function post(operationConfig?: ControllerRequestBodyOperationConfig) {
  return provideControllerOperationDecorator({ method: 'post', ...operationConfig });
}

export function put(operationConfig?: ControllerRequestBodyOperationConfig) {
  return provideControllerOperationDecorator({ method: 'put', ...operationConfig });
}

export function patch(operationConfig?: ControllerRequestBodyOperationConfig) {
  return provideControllerOperationDecorator({ method: 'patch', ...operationConfig });
}

function provideControllerOperationDecorator(baseMetadata: ControllerOperationBaseMetadata) {
  return function (target: AzureFunctions, propertyKey: string | symbol) {
    const ownMetadata = Reflect.getOwnMetadata(HTTP_OPERATION_METADATA_KEY, target, propertyKey);
    const argsMetadata = (ownMetadata ??
      shared.initializeMetadata(target, propertyKey, getCommonArg)) as ControllerOperationArgsMetadata;
    const metadata: ControllerOperationMetadata = {
      ...baseMetadata,
      ...argsMetadata,
    };
    Reflect.defineMetadata(HTTP_OPERATION_METADATA_KEY, metadata, target, propertyKey);
  };
}

export function body(bodyConfig: ControllerRequest) {
  return adjustOperationMetadata({
    type: 'body',
    ...bodyConfig,
  });
}

export interface PathParamConfig {
  name: string;
  schema?: PathSchema;
}

export function pathParam(config: PathParamConfig) {
  return adjustOperationMetadata({
    type: 'path',
    ...config,
  });
}

export interface QueryParamConfig {
  name: string;
  schema?: QueryItemSchema;
}

export function queryParam(config: QueryParamConfig) {
  return adjustOperationMetadata({
    type: 'query',
    ...config,
  });
}

export interface HeaderParamConfig {
  name: string;
  schema?: ZodType<string | undefined>;
}

export function headerParam(config: HeaderParamConfig) {
  return adjustOperationMetadata({
    type: 'header',
    ...config,
  });
}

export function request() {
  return adjustOperationMetadata({
    type: 'request',
  });
}

export function user() {
  return adjustOperationMetadata({
    type: 'user',
  });
}

function adjustOperationMetadata(operationArg: OperationArgMetadata) {
  return adjustMetadata(HTTP_OPERATION_METADATA_KEY, operationArg, getCommonArg);
}

function getCommonArg(paramType: unknown): ControllerOperationCommonArgMetadata {
  if (paramType === HttpRequest) {
    return { type: 'request' };
  } else {
    return shared.getCommonArg(paramType);
  }
}
