import { HttpRequest, InvocationContext } from '@azure/functions';
import { HttpResponseInit } from '@azure/functions/types/http';
import { StatusCodes } from 'http-status-codes';
import { Container, inject, injectable } from 'inversify';
import { PLATFORM_CONTAINER, PlatformContextLocalStorage, SYSTEM_USER_ACCOUNT, UserAccount } from 'shared';
import { AzureHttpTriggerService } from './azure-http-trigger.service';
import { HttpOperationRegistrationData } from './http-controller-registration.service';
import { AuthenticationError, AuthenticationSchemeService, AuthenticationServiceFactory } from './security';

export type RequestHandler = (request: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit>;

@injectable()
export class HttpRequestHandlerProvider {
  constructor(
    private readonly httpTriggerService: AzureHttpTriggerService,
    @inject(PLATFORM_CONTAINER) private readonly platformContainer: Container,
    private readonly authenticationServiceFactory: AuthenticationServiceFactory,
    @inject(SYSTEM_USER_ACCOUNT) private readonly systemUserAccount: UserAccount,
  ) {}

  getHttpRequestHandler(
    registrationData: HttpOperationRegistrationData,
    method: (...args: unknown[]) => Promise<unknown>,
  ): RequestHandler {
    const { application, operationMetadata } = registrationData;
    const argsProvider = this.httpTriggerService.buildArgProviders(operationMetadata);
    const authorizationServices = this.authenticationServiceFactory.getAuthenticationServices({
      operationSecurities: operationMetadata.security,
      applicationSecurities: application.openApiConfig.security,
    });
    return async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
      let userAccount: UserAccount;
      try {
        userAccount = await this.authenticate(authorizationServices, request, context);
        if (
          !(
            operationMetadata.permissions?.some((permission: string) => userAccount.permissions.includes(permission)) ??
            true
          )
        ) {
          return {
            status: StatusCodes.UNAUTHORIZED,
            body: 'Not enough permissions.',
          };
        }
      } catch (e) {
        if (e instanceof AuthenticationError) {
          return {
            status: StatusCodes.UNAUTHORIZED,
            body: e.message,
          };
        } else {
          return {
            status: StatusCodes.INTERNAL_SERVER_ERROR,
            body: 'Internal authorization error.',
          };
        }
      }
      const contextStorage = await this.platformContainer.getAsync(PlatformContextLocalStorage);
      return await contextStorage.run({ invocationContext: context, userAccount }, async () => {
        return await this.httpTriggerService.handleHttpRequest(context, operationMetadata, async () => {
          const args = await argsProvider(request, context, userAccount);
          return await method(...args);
        });
      });
    };
  }

  private async authenticate(
    authenticationServices: AuthenticationSchemeService[],
    request: HttpRequest,
    context: InvocationContext,
  ): Promise<UserAccount> {
    if (authenticationServices.length === 0) {
      return this.systemUserAccount;
    }
    const errors = new Array<string>();
    for (const { securityScheme, authenticationService } of authenticationServices) {
      try {
        return await authenticationService.authenticate(request, context);
      } catch (err: unknown) {
        if (err instanceof AuthenticationError) {
          errors.push(` ${securityScheme}: ${err.message}`);
        } else {
          throw err;
        }
      }
    }
    throw new AuthenticationError(`Couldn't authenticate:
${errors.join('\n')}`);
  }
}
