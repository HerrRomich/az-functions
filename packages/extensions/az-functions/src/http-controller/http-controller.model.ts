import { Cookie, HttpResponseInit } from '@azure/functions';
import { getReasonPhrase, StatusCodes } from 'http-status-codes';
import * as _ from 'lodash';
import * as path from 'node:path';
import type { OpenAPIObject } from 'openapi3-ts/oas30';
import { AzFunctionsRuntimeError } from 'shared';
import { z } from 'zod';

export type OpenAPIObjectConfig = Omit<OpenAPIObject, 'paths' | 'webhooks'>;

/**
 * Represents a REST application with a name, context, and OpenAPI configuration.
 *
 * @property name The name of the REST application.
 * @property context The context path for the REST application.
 * @property openApiConfig The OpenAPI configuration for the REST application.
 */
export interface RestApplication {
  name: string;
  context: string;
  openApiConfig: OpenAPIObjectConfig;
}

/**
 * Represents the options for an HTTP trigger error, including the response and additional details.
 *
 * @property response The HTTP response initialization options, including the status.
 * @property details Additional details about the error.
 */
export interface HttpTriggerErrorOptions<Status extends number = number> extends ErrorOptions {
  response?: HttpResponseInit & { status?: Status };
  details?: Record<string, unknown>;
}

export abstract class BaseHttpTriggerError<Status extends number = number> extends AzFunctionsRuntimeError {
  private readonly _response: HttpResponseInit;
  protected abstract getStatus(): Status;
  get status(): number {
    return this.getStatus();
  }

  constructor(message?: string, options?: HttpTriggerErrorOptions<Status>) {
    super(message, { cause: options?.cause, details: options?.details });
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
    const response = options?.response;
    const status = response?.status ?? this.getStatus();
    this.message = message ?? getReasonPhrase(status);
    this._response = {
      ...response,
      status,
      ...(response?.body === undefined && response?.jsonBody === undefined ? { body: this.message } : {}),
    };
    this._details = {
      httpStatus: this.getStatus(),
      reasonPhrase: getReasonPhrase(this.getStatus()),
      ...options?.details,
    };
  }

  get response(): HttpResponseInit {
    return this._response;
  }
}

/**
 * Represents a common HTTP trigger error with a default status of 500 (Internal Server Error).
 *
 * It can optionally include a response object with a specific status and body, and additional details about the error.
 *
 * @example
 * ```ts
 * throw new CommonHttpTriggerError('Resource was not found', {
 *   response: {
 *     status: 404,
 *     jsonBody: {
 *       error: 'Resource not found'
 *     }
 *   }
 * });
 * ```
 */
export class CommonHttpTriggerError extends BaseHttpTriggerError {
  override getStatus(): number {
    return this.response?.status ?? StatusCodes.INTERNAL_SERVER_ERROR;
  }
}

/**
 * Represents a Bad Request (400) HTTP trigger error.
 */
export class BadRequestError extends BaseHttpTriggerError<StatusCodes.BAD_REQUEST> {
  override getStatus(): StatusCodes.BAD_REQUEST {
    return StatusCodes.BAD_REQUEST;
  }
}

/**
 * Represents an Unauthorized (401) HTTP trigger error.
 */
export class UnauthorizedError extends BaseHttpTriggerError<StatusCodes.UNAUTHORIZED> {
  override getStatus(): StatusCodes.UNAUTHORIZED {
    return StatusCodes.UNAUTHORIZED;
  }
}

/**
 * Represents a Forbidden (403) HTTP trigger error.
 */
export class ForbiddenError extends BaseHttpTriggerError<StatusCodes.FORBIDDEN> {
  override getStatus(): StatusCodes.FORBIDDEN {
    return StatusCodes.FORBIDDEN;
  }
}

/**
 * Represents a Not Found (404) HTTP trigger error.
 */
export class NotFoundError extends BaseHttpTriggerError<StatusCodes.NOT_FOUND> {
  override getStatus(): StatusCodes.NOT_FOUND {
    return StatusCodes.NOT_FOUND;
  }
}

/**
 * Represents an Internal Server Error (500) HTTP trigger error.
 */
export class InternalServerError extends BaseHttpTriggerError<StatusCodes.INTERNAL_SERVER_ERROR> {
  override getStatus(): StatusCodes.INTERNAL_SERVER_ERROR {
    return StatusCodes.INTERNAL_SERVER_ERROR;
  }
}

/**
 * Default Zod schema for validating string values.
 */
export const StringSchema = z.string();

/**
 * Default Zod schema for validating optional string values.
 */
export const OptionalStringSchema = StringSchema.optional();

/**
 * Default Zod schema for validating number values.
 */
export const NumberSchema = z.number();

/**
 * Abstract builder class for constructing HTTP direct responses.
 *
 * @template T The type of the JSON body to be included in the response.
 */
export abstract class HttpDirectResponseBuilder<T = unknown> {
  abstract status(status: number): HttpDirectResponseBuilder<T>;
  abstract header(name: string, value: string): HttpDirectResponseBuilder<T>;
  abstract addCookie(value: Cookie): HttpDirectResponseBuilder<T>;
  abstract jsonBody(body: T): HttpDirectResponseBuilder<T>;
  abstract build(): HttpResponseInit;

  /**
   * Creates a new instance of the HTTP direct response builder.
   *
   * @template T The type of the JSON body to be included in the response.
   * @returns A new instance of HttpDirectResponseBuilder.
   */
  static builder<T>(): HttpDirectResponseBuilder<T> {
    return new HttpDirectResponseBuilderImpl<T>();
  }
}

export class HttpDirectResponseBuilderImpl<T = unknown> extends HttpDirectResponseBuilder<T> {
  private _status: number = StatusCodes.OK;
  private _headers?: Record<string, string>;
  private _cookies?: Cookie[];
  private _jsonBody?: T;

  status(status: number): HttpDirectResponseBuilder<T> {
    this._status = status;
    return this;
  }

  header(name: string, value: string): HttpDirectResponseBuilder<T> {
    if (!this._headers) {
      this._headers = {};
    }
    this._headers[name] = value;
    return this;
  }

  addCookie(value: Cookie): HttpDirectResponseBuilder<T> {
    if (!this._cookies) {
      this._cookies = [];
    }
    this._cookies.push(value);
    return this;
  }

  jsonBody(body: T): HttpDirectResponseBuilder<T> {
    this._jsonBody = body;
    return this;
  }

  build(): HttpResponseInit {
    return {
      status: this._status,
      headers: _.cloneDeep(this._headers),
      cookies: _.cloneDeep(this._cookies),
      jsonBody: _.cloneDeep(this._jsonBody),
    };
  }
}

export function joinPosix(...segments: string[]): string {
  return path.posix.join(...segments.map(s => _.trim(s, '/')));
}

const HttpResponseInitSchema = z
  .object({
    status: z.number().optional(),
    headers: z.record(z.string(), z.string()).optional(),
    cookies: z.array(z.any()).optional(),
    body: z.any().optional(),
    jsonBody: z.any().optional(),
    enableContentNegotiation: z.boolean().optional(),
  })
  .refine(obj => Object.values(obj).some(v => v !== undefined), { message: 'At least one property must be provided' });

export function isHttpResponseInit(obj: unknown): obj is HttpResponseInit {
  return HttpResponseInitSchema.safeParse(obj).success;
}
