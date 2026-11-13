import { HttpRequest, InvocationContext } from '@azure/functions';
import { HttpResponseInit } from '@azure/functions/types/http';
import { PLATFORM_CONTEXT_MANAGER, PLATFORM_CONTEXT_PROVIDER, PlatformContextManager } from 'context';
import { getReasonPhrase, StatusCodes } from 'http-status-codes';
import { Container, inject, injectable } from 'inversify';
import { adjustContextLoggerMetadata, LOGGER_FACTORY, LoggerFactory } from 'logger';
import { AuthContext, AUTHENTICATION_CONTEXT_KEY } from 'security';
import { PLATFORM_CONTAINER } from 'shared';
import { BaseHttpTriggerError } from './http-controller.model';
import { HttpHandlerSupportFactory, HttpRequestProcessorInput } from './http-handler-support.factory';
import { HttpOperationRegistration } from './http-operations-registration.service';
import { AuthenticatorProvider } from './security/authenticator.provider';

export type RequestHandler = (request: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit>;

@injectable()
export class HttpHandlerFactory {
  private readonly logger;

  constructor(
    @inject(LOGGER_FACTORY) loggerFactory: LoggerFactory,
    @inject(PLATFORM_CONTAINER) private readonly platformContainer: Container,
    private readonly supportService: HttpHandlerSupportFactory,
    private readonly authenticationProvider: AuthenticatorProvider,
  ) {
    this.logger = loggerFactory();
  }

  createHandler(
    operationRegistration: HttpOperationRegistration,
    method: (...args: unknown[]) => Promise<unknown>,
  ): RequestHandler {
    const { operationMetadata } = operationRegistration;
    const argsProvider = this.supportService.createRequestArgsProvider(operationMetadata.args);
    const responseProcessor = this.supportService.createResponseProcessor(operationMetadata.directResponse);
    const contextManager = this.platformContainer.get(PLATFORM_CONTEXT_MANAGER);
    const contextProvider = this.platformContainer.get(PLATFORM_CONTEXT_PROVIDER);
    const authenticator = this.authenticationProvider.provideAuthenticator(operationRegistration);
    return async (request: HttpRequest, invocationContext: InvocationContext): Promise<HttpResponseInit> => {
      return await contextManager.runWith(
        contextProvider.providePlatformContext(invocationContext),
        async (): Promise<HttpResponseInit> => {
          return await this.extracted(
            { contextManager, operationRegistration, authenticator, argsProvider, responseProcessor },
            method,
            request,
          );
        },
      );
    };
  }

  private async extracted(
    input: {
      contextManager: PlatformContextManager;
      operationRegistration: HttpOperationRegistration;
      authenticator: (request: HttpRequest) => Promise<AuthContext>;
      argsProvider: (input: HttpRequestProcessorInput) => Promise<unknown[]>;
      responseProcessor: (response: unknown) => Promise<HttpResponseInit>;
    },
    method: (...args: unknown[]) => Promise<unknown>,
    request: HttpRequest,
  ) {
    const { contextManager, operationRegistration, authenticator, argsProvider, responseProcessor } = input;
    const operationId = operationRegistration.operationMetadata.operationId;
    const activePlatformContext = contextManager.active()!;
    const invocationContext = activePlatformContext.invocationContext;
    adjustContextLoggerMetadata(contextManager, {
      error: {
        operationRegistration,
      },
      warn: {
        operationId,
      },
      silly: {
        operationRegistration,
      },
    });
    this.logger.http(`Processing HTTP request for operation ${operationId} started`, {
      request,
    });
    this.logger.silly(`Processing HTTP request for operation ${operationId} started`, {
      request,
    });
    let response: HttpResponseInit;
    try {
      const authContext = await authenticator(request);
      activePlatformContext.setValue(AUTHENTICATION_CONTEXT_KEY, authContext);
      const args = await argsProvider({ request, invocationContext, authContext });
      this.logger.debug(`Calling controller method for operation ${operationId} with arguments`, {
        args,
      });
      const result = await method(...args);
      this.logger.debug(`Controller method for operation ${operationId} called`);
      response = await responseProcessor(result);
      this.logger.http(`HTTP request processed for operation ${operationId}`, {
        response,
      });
      this.logger.silly(`HTTP request for operation ${operationId} processed`, {
        response,
      });
    } catch (e) {
      if (e instanceof BaseHttpTriggerError) {
        this.logger.warn(e.message, {
          operationId,
          ...e.details,
        });
        response = e.response;
      } else {
        this.logger.error(`Failed to process HTTP request for operation ${operationId}`, {
          httpStatus: StatusCodes.INTERNAL_SERVER_ERROR,
          reasonPhrase: getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR),
          error: e,
        });
        response = {
          status: StatusCodes.INTERNAL_SERVER_ERROR,
          body: 'Internal server error.',
        };
      }
      this.logger.http(`Failed to process HTTP request for operation ${operationId}`, {
        response,
      });
      this.logger.silly(`Failed to process HTTP request for operation ${operationId}`, {
        response,
      });
    }
    return response;
  }
}
