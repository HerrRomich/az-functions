import { HttpResponseInit } from '@azure/functions';
import { StatusCodes } from 'http-status-codes';
import type { OpenAPIObject, ResponseObject, SchemaObject } from 'openapi3-ts/oas30';
import { ZodType } from 'zod';
import { ServiceIdentifier } from 'inversify';
import { AzureFunctionError } from 'shared';

export const REST_APPLICATION: ServiceIdentifier<RestApplication> = Symbol.for('REST_APPLICATION');

export const API_SCHEMA: ServiceIdentifier<ApiSchema> = Symbol.for('API_SCHEMA');
export interface ApiSchema {
  name: string;
  schema: ZodType | SchemaObject;
}

export const API_RESPONSE: ServiceIdentifier<ApiResponse> = Symbol.for('API_RESPONSE');
export interface ApiResponse {
  name: string;
  response: ResponseObject;
}

export type OpenAPIObjectConfig = Omit<OpenAPIObject, 'paths' | 'components' | 'webhooks'>;
export interface RestApplication {
  name: string;
  context: string;
  openApiConfig: OpenAPIObjectConfig;
}

export type ErrorResponse = Pick<HttpResponseInit, 'body' | 'jsonBody'>;

export interface HttpTriggerErrorOptions extends ErrorOptions {
  response?: HttpResponseInit;
}

export class HttpTriggerError extends AzureFunctionError {
  private readonly _response: HttpResponseInit;
  constructor(message?: string, options?: HttpTriggerErrorOptions) {
    super(message, options);
    this._response = {
      ...options?.response,
      status: options?.response?.status ?? StatusCodes.INTERNAL_SERVER_ERROR,
      body: options?.response?.body ?? message,
    };
  }

  get response(): HttpResponseInit {
    return this._response;
  }
}

export class BadRequestError extends HttpTriggerError {
  constructor(message?: string, options?: HttpTriggerErrorOptions) {
    super(message, { ...options, response: { ...options?.response, status: StatusCodes.BAD_REQUEST } });
  }
}

export class UnauthorizedError extends HttpTriggerError {
  constructor(message?: string, options?: HttpTriggerErrorOptions) {
    super(message, { ...options, response: { ...options?.response, status: StatusCodes.UNAUTHORIZED } });
  }
}

export class NotFoundError extends HttpTriggerError {
  constructor(message?: string, options?: HttpTriggerErrorOptions) {
    super(message, { ...options, response: { ...options?.response, status: StatusCodes.NOT_FOUND } });
  }
}

export class InternalServerError extends HttpTriggerError {
  constructor(message?: string, options?: HttpTriggerErrorOptions) {
    super(message, { ...options, response: { ...options?.response, status: StatusCodes.INTERNAL_SERVER_ERROR } });
  }
}
