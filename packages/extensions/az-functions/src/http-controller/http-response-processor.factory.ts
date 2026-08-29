import { HttpHeadersInit } from '@azure/functions';
import { HttpResponseInit } from '@azure/functions/types/http';
import { StatusCodes } from 'http-status-codes';
import { injectable } from 'inversify';
import { parseWithZod } from 'shared';
import { ZodType } from 'zod';
import { DirectResponseObject } from './decorators';
import { InternalServerError } from './http-controller.model';

export type ResponsePartialProcessor = (input: HttpResponseInit) => Promise<HttpResponseInit>;

@injectable()
export class HttpResponseProcessorFactory {
  provideStatusProcessor(directResponse?: DirectResponseObject): ResponsePartialProcessor {
    const directStatus = directResponse?.status ?? StatusCodes.OK;
    return async input => {
      if (input.status === undefined) {
        return { status: directStatus };
      } else if (input.status !== directStatus) {
        throw new InternalServerError(
          `Response status code ${input.status} does not match direct response status code ${directStatus}.`,
        );
      } else {
        return input;
      }
    };
  }

  provideJsonBodyProcessor(directResponse?: DirectResponseObject): ResponsePartialProcessor | undefined {
    const contentSchema = directResponse?.jsonContent?.schema;
    if (contentSchema instanceof ZodType) {
      return async input => {
        return {
          jsonBody: this.parseJsonBody(contentSchema, input.jsonBody),
        };
      };
    }
  }

  private parseJsonBody(schema: ZodType<unknown>, data: unknown): unknown {
    try {
      return parseWithZod(schema, data);
    } catch (e) {
      throw new InternalServerError('Failed to parse response body', { cause: e, details: { responseBody: data } });
    }
  }

  provideHeaderProcessor(directResponse?: DirectResponseObject): ResponsePartialProcessor | undefined {
    const responseHeader = directResponse?.headers;
    if (responseHeader instanceof ZodType) {
      return async input => {
        const parsedHeaders = this.parseDirectResponseHeaders(responseHeader, input.headers);
        return {
          headers: parsedHeaders,
        };
      };
    }
  }

  private parseDirectResponseHeaders(
    schema: ZodType<Record<string, string>>,
    headers?: HttpHeadersInit,
  ): Record<string, string> {
    const headersRecord: Record<string, string> = {};
    new Headers(headers).forEach((value, key) => {
      headersRecord[key] = value;
    });
    try {
      return parseWithZod(schema, headersRecord);
    } catch (e) {
      throw new InternalServerError('Response headers do not match direct response headers schema', {
        cause: e,
        details: { headers: headersRecord },
      });
    }
  }
}
