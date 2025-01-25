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

export function Controller(config: ControllerConfig) {
  return function <T extends AzureFunctions>(target: T) {
    const metadata: ControllerMetadata = {
      type: 'http-controller',
      ...config,
    };
    Reflect.defineMetadata(AZURE_FUNCTION_METADATA_KEY, metadata, target);
    decorate(injectable(), target);
  };
}

export function Get(operationConfig?: ControllerOperationConfig) {
  return provideControllerOperationDecorator({ method: 'get', ...operationConfig });
}

export function Head(operationConfig?: ControllerOperationConfig) {
  return provideControllerOperationDecorator({ method: 'head', ...operationConfig });
}

export function Delete(operationConfig?: ControllerOperationConfig) {
  return provideControllerOperationDecorator({ method: 'delete', ...operationConfig });
}

export function Post(operationConfig?: ControllerRequestBodyOperationConfig) {
  return provideControllerOperationDecorator({ method: 'post', ...operationConfig });
}

export function Put(operationConfig?: ControllerRequestBodyOperationConfig) {
  return provideControllerOperationDecorator({ method: 'put', ...operationConfig });
}

export function Patch(operationConfig?: ControllerRequestBodyOperationConfig) {
  return provideControllerOperationDecorator({ method: 'patch', ...operationConfig });
}

function provideControllerOperationDecorator(baseMetadata: ControllerOperationBaseMetadata) {
  return function (target: AzureFunctions, propertyKey: string | symbol) {
    const argsMetadata = (Reflect.getOwnMetadata(HTTP_OPERATION_METADATA_KEY, target, propertyKey) ??
      initializeMetadata(target, propertyKey)) as ControllerOperationArgsMetadata;
    const metadata: ControllerOperationMetadata = {
      ...baseMetadata,
      ...argsMetadata,
    };
    Reflect.defineMetadata(HTTP_OPERATION_METADATA_KEY, metadata, target, propertyKey);
  };
}

export function Body(bodyConfig: ControllerRequest) {
  return adjustOperationMetadata({
    type: 'body',
    ...bodyConfig,
  });
}

export interface PathParamConfig {
  name: string;
  schema?: PathSchema;
}

export function PathParam(config: PathParamConfig) {
  return adjustOperationMetadata({
    type: 'path',
    ...config,
  });
}

export interface QueryParamConfig {
  name: string;
  schema?: QueryItemSchema;
}

export function QueryParam(config: QueryParamConfig) {
  return adjustOperationMetadata({
    type: 'query',
    ...config,
  });
}

export interface HeaderParamConfig {
  name: string;
  schema?: ZodType<string | undefined>;
}

export function HeaderParam(config: HeaderParamConfig) {
  return adjustOperationMetadata({
    type: 'header',
    ...config,
  });
}

export function Request() {
  return adjustOperationMetadata({
    type: 'request',
  });
}

export function User() {
  return adjustOperationMetadata({
    type: 'user',
  });
}

function adjustOperationMetadata(operationArg: OperationArgMetadata) {
  return adjustMetadata(HTTP_OPERATION_METADATA_KEY, operationArg, getCommonArg);
}

function initializeMetadata(target: AzureFunctions, propertyKey: string | symbol): ControllerOperationArgsMetadata {
  return shared.initializeMetadata(target, propertyKey, getCommonArg);
}

function getCommonArg(paramType: unknown): ControllerOperationCommonArgMetadata {
  if (paramType === HttpRequest) {
    return { type: 'request' };
  } else {
    return shared.getCommonArg(paramType);
  }
}
