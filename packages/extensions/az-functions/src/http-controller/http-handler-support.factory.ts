import { HttpRequest, InvocationContext } from '@azure/functions';
import { HttpResponseInit } from '@azure/functions/types/http';
import { injectable } from 'inversify';
import * as _ from 'lodash';
import { AuthContext } from 'security';
import { AzFunctionsSystemError } from 'shared';
import { Promisable } from 'type-fest';
import { ControllerOperationArgMetadata, DirectResponseObject } from './decorators';
import { InternalServerError, isHttpResponseInit, OptionalStringSchema } from './http-controller.model';
import { HttpRequestArgProviderFactory } from './http-request-arg-provider.factory';
import { HttpResponseProcessorFactory, ResponsePartialProcessor } from './http-response-processor.factory';

export class HttpTriggerDefinitionError extends AzFunctionsSystemError {}

export interface HttpRequestProcessorInput {
  request: HttpRequest;
  invocationContext: InvocationContext;
  authContext: AuthContext;
}
export type HttpRequestArgsProvider = (input: HttpRequestProcessorInput) => Promise<unknown[]>;
export type HttpRequestArgProvider = (input: HttpRequestProcessorInput) => Promisable<unknown>;

export type HttpResponseProcessor = (response: unknown) => Promise<HttpResponseInit>;

@injectable()
export class HttpHandlerSupportFactory {
  constructor(
    private readonly httpRequestArgProviderFactory: HttpRequestArgProviderFactory,
    private readonly httpResponseProcessorFactory: HttpResponseProcessorFactory,
  ) {}

  createRequestArgsProvider(operationArgs: ControllerOperationArgMetadata[]): HttpRequestArgsProvider {
    this.validateArgs(operationArgs);
    const argProviders: HttpRequestArgProvider[] = [];
    for (const arg of operationArgs) {
      switch (arg.type) {
        case 'path': {
          argProviders.push(this.httpRequestArgProviderFactory.createPathParamArgProvider(arg));
          break;
        }
        case 'header': {
          const headerItemName = arg.name;
          const headerSchema = arg.schema ?? OptionalStringSchema;
          argProviders.push(this.httpRequestArgProviderFactory.createHeaderProvider(headerItemName, headerSchema));
          break;
        }
        case 'query': {
          argProviders.push(this.httpRequestArgProviderFactory.createQueryItemArgProvider(arg));
          break;
        }
        case 'request':
          argProviders.push(({ request }) => request);
          break;
        case 'invocationContext':
          argProviders.push(({ invocationContext }) => invocationContext);
          break;
        case 'authContext':
          argProviders.push(({ authContext }) => authContext);
          break;
        case 'body':
          argProviders.push(this.httpRequestArgProviderFactory.createBodyArgProvider(arg.schema));
          break;
        case 'undefined':
          argProviders.push(() => undefined);
          break;
      }
    }
    return this.httpRequestArgProviderFactory.createArgsProvider(argProviders);
  }

  private validateArgs(operationArgs: ControllerOperationArgMetadata[]) {
    let bodyParamCount = 0;
    let requestParamCount = 0;
    for (const arg of operationArgs) {
      if (arg.type === 'body') {
        bodyParamCount++;
      }
      if (arg.type === 'request') {
        requestParamCount++;
      }
    }
    if (bodyParamCount > 1) {
      throw new HttpTriggerDefinitionError('Multiple body parameters are not allowed in a single operation.');
    }
    if (requestParamCount > 1) {
      throw new HttpTriggerDefinitionError('Multiple request parameters are not allowed in a single operation.');
    }
    if (bodyParamCount > 0 && requestParamCount > 0) {
      throw new HttpTriggerDefinitionError('Cannot have both body and request parameters in a single operation.');
    }
  }

  createResponseProcessor(directResponse?: DirectResponseObject): HttpResponseProcessor {
    const partialProcessors: ResponsePartialProcessor[] = [
      this.httpResponseProcessorFactory.provideJsonBodyProcessor(directResponse),
      this.httpResponseProcessorFactory.provideStatusProcessor(directResponse),
      this.httpResponseProcessorFactory.provideHeaderProcessor(directResponse),
    ].filter((processor): processor is ResponsePartialProcessor => processor !== undefined);

    return async (value: unknown): Promise<HttpResponseInit> => {
      let input: HttpResponseInit;
      if (isHttpResponseInit(value)) {
        if (directResponse === undefined) {
          return value;
        } else {
          input = value;
        }
      } else {
        if (directResponse === undefined) {
          throw new InternalServerError(
            'Controller method should return HttpResponseInit when directResponse is not defined',
          );
        }
        input = {
          jsonBody: value,
        };
      }
      const processionResults = await Promise.allSettled(partialProcessors.map(processor => processor(input)));

      const [fulfilled, rejected] = _.partition(processionResults, result => result.status === 'fulfilled');
      if (rejected.length > 0) {
        const errors = rejected.map(reason => reason.reason);
        throw new InternalServerError('Failed processing response', {
          details: { errors },
        });
      }
      return fulfilled.reduce((acc, result) => {
        return { ...acc, ...result.value };
      }, input);
    };
  }
}
