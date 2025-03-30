import { HttpResponseInit } from '@azure/functions';
import { StatusCodes } from 'http-status-codes';
import type { OpenAPIObject, ResponseObject, SchemaObject } from 'openapi3-ts/oas30';
import { ZodTypeAny } from 'zod';

export const REST_APPLICATION = Symbol.for('REST_APPLICATION');

export const API_SCHEMA = Symbol.for('API_SCHEMA');
export interface ApiSchema {
  name: string;
  schema: ZodTypeAny | SchemaObject;
}

export const API_RESPONSE = Symbol.for('API_RESPONSE');
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

export class HttpTriggerError extends Error {
  private readonly _response: HttpResponseInit;
  constructor(message: string, options?: HttpTriggerErrorOptions) {
    super(message, options);
    this._response = {
      ...options?.response,
      status: options?.response?.status ?? StatusCodes.INTERNAL_SERVER_ERROR,
      ...{ body: options?.response?.body ?? message },
    };
    this.name = 'HttpTriggerError';
    Object.setPrototypeOf(this, HttpTriggerError.prototype);
  }

  get response(): HttpResponseInit {
    return this._response;
  }
}

export class BadRequestError extends HttpTriggerError {
  constructor(message: string, options?: HttpTriggerErrorOptions) {
    super(message, { ...options, response: { ...options?.response, status: StatusCodes.BAD_REQUEST } });
    this.name = 'BadRequestError';
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

export class UnauthorizedError extends HttpTriggerError {
  constructor(message: string, options?: HttpTriggerErrorOptions) {
    super(message, { ...options, response: { ...options?.response, status: StatusCodes.UNAUTHORIZED } });
    this.name = 'UnauthorizedError';
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

export class NotFoundError extends HttpTriggerError {
  constructor(message: string, options?: HttpTriggerErrorOptions) {
    super(message, { ...options, response: { ...options?.response, status: StatusCodes.NOT_FOUND } });
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class InternalServerError extends HttpTriggerError {
  constructor(message: string, options?: HttpTriggerErrorOptions) {
    super(message, { ...options, response: { ...options?.response, status: StatusCodes.INTERNAL_SERVER_ERROR } });
    this.name = 'InternalServerError';
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
}
