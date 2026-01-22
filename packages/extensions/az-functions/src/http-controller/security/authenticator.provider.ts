import { HttpRequest } from '@azure/functions';
import { inject, injectable } from 'inversify';
import { LOGGER_FACTORY, LoggerFactory } from 'logger';
import { AuthContext, AuthenticationError, Principal } from 'security';
import { ForbiddenError, UnauthorizedError } from '../http-controller.model';
import { HttpOperationRegistration } from '../http-operations-registration.service';
import {
  OperationAuthenticationResolver,
  SecurityBinding,
  SecurityBindingObject,
} from './operation-authentication.resolver';
import { FallbackPrincipalMergeService } from './principal-merge.service';

interface BaseAuthenticationResult {
  state: string;
  scheme: string;
}

interface SuccessfulAuthenticationResult extends BaseAuthenticationResult {
  state: 'successful';
  principal: Principal;
}

interface FailedAuthenticationResult extends BaseAuthenticationResult {
  state: 'unauthenticated' | 'unauthorized';
  error: unknown;
}

export type AuthenticationResult = SuccessfulAuthenticationResult | FailedAuthenticationResult;

interface BaseAndAuthenticationResult {
  authentications: AuthenticationResult[];
}

interface SuccessfulAndAuthenticationResult extends BaseAndAuthenticationResult {
  state: 'successful';
  authContext: AuthContext;
}

interface FailedAndAuthenticationResult extends BaseAndAuthenticationResult {
  state: 'unauthenticated' | 'unauthorized';
}

interface SkippedAndAuthenticationResult {
  state: 'skipped';
  authentications: {
    scheme: string;
    state: 'skipped';
  }[];
}

type AndAuthenticationResult = SuccessfulAndAuthenticationResult | FailedAndAuthenticationResult;
type AndAuthenticationResults = (AndAuthenticationResult | SkippedAndAuthenticationResult)[];

interface AuthenticationResultsByState {
  successful: SuccessfulAuthenticationResult[];
  unauthenticated: FailedAuthenticationResult[];
  unauthorized: FailedAuthenticationResult[];
}

export type AuthenticationHandler = (request: HttpRequest) => Promise<AuthContext>;

@injectable()
export class AuthenticatorProvider {
  private readonly logger;

  constructor(
    @inject(LOGGER_FACTORY) loggerFactory: LoggerFactory,
    private readonly operationAuthenticationResolver: OperationAuthenticationResolver,
    private readonly principalMergeService: FallbackPrincipalMergeService,
  ) {
    this.logger = loggerFactory();
  }

  provideAuthenticator(registrationData: HttpOperationRegistration): AuthenticationHandler {
    const { operationId } = registrationData;
    const securityBindings = this.operationAuthenticationResolver.getOperationSecurityBindings(registrationData);
    if (securityBindings.length === 0) {
      this.logger.info(`No authentication required for operation id=${operationId}.`);
      this.logger.debug(`No authentication required for operation id=${operationId}.`, {
        registrationData,
      });
      return this.operationAuthenticationResolver.defaultAuthenticator(registrationData);
    }
    this.logger.info(`Authentication required for operation id=${operationId}.`);
    this.logger.debug(`Authentication required for operation id=${operationId}.`, {
      operationId,
      security: securityBindings,
      registrationData,
    });
    return async (request): Promise<AuthContext> => {
      return await this.authenticate(operationId, securityBindings, request);
    };
  }

  private async authenticate(
    operationId: string,
    securityBindings: SecurityBindingObject[],
    request: HttpRequest,
  ): Promise<AuthContext> {
    this.logger.info(`Authenticating request for operation id=${operationId}.`);
    this.logger.debug(`Authenticating request for operation id=${operationId}.`, {
      operationId,
      security: securityBindings,
      request,
    });

    let andAuthenticationResult: AndAuthenticationResult = {
      state: 'unauthenticated',
      authentications: [],
    };
    const andAuthenticationResults: AndAuthenticationResults = [];

    for (const securityBinding of securityBindings) {
      if (andAuthenticationResult.state === 'unauthenticated') {
        const authenticationResults = await Promise.all(
          Object.entries(securityBinding).map(
            async ([scheme, binding]): Promise<AuthenticationResult> =>
              await this.authenticateSecurityBinding(operationId, scheme, binding, request),
          ),
        );

        andAuthenticationResult = this.getAndAuthenticationResult(authenticationResults);
        andAuthenticationResults.push(andAuthenticationResult);
      } else {
        andAuthenticationResults.push({
          state: 'skipped',
          authentications: Object.keys(securityBinding).map(scheme => ({
            scheme,
            state: 'skipped',
          })),
        });
      }
    }
    const details = {
      operationId,
      authentications: andAuthenticationResults,
    };
    switch (andAuthenticationResult.state) {
      case 'successful':
        this.logger.info(`Authentication successful for operation id=${operationId}`);
        this.logger.debug(`Authentication successful for operation id=${operationId}`, details);
        return andAuthenticationResult.authContext;
      case 'unauthenticated':
        throw new UnauthorizedError('Authentication failed', { details });
      case 'unauthorized':
        throw new ForbiddenError('Authorization failed', { details });
    }
  }

  private async authenticateSecurityBinding(
    operationId: string,
    scheme: string,
    binding: SecurityBinding,
    request: HttpRequest,
  ): Promise<AuthenticationResult> {
    const { authService, scopes } = binding;
    try {
      const principal = await authService.authenticate(request);
      if (scopes.some(scope => !principal.scopes.includes(scope))) {
        this.logger.silly(
          `Identity does not have required scopes for scheme=${scheme} in operation id=${operationId}`,
          {
            operationId,
            scheme,
            requiredScopes: scopes,
            principalScopes: principal.scopes,
          },
        );
        return {
          scheme,
          state: 'unauthorized',
          error: new UnauthorizedError(`Identity does not have required scopes for scheme=${scheme}`, {
            details: {
              scheme,
              requiredScopes: scopes,
              principalScopes: principal.scopes,
            },
          }),
        };
      } else {
        return {
          scheme,
          principal,
          state: 'successful',
        };
      }
    } catch (error) {
      if (error instanceof AuthenticationError) {
        this.logger.silly(`Authentication failed for scheme=${scheme} in operation id=${operationId}`, {
          operationId,
          scheme,
          error,
        });
        return {
          scheme,
          state: 'unauthenticated',
          error,
        };
      }
      throw error;
    }
  }

  private getAndAuthenticationResult(authenticationResults: AuthenticationResult[]): AndAuthenticationResult {
    const resultsByState = authenticationResults.reduce<AuthenticationResultsByState>(
      (acc, result) => {
        switch (result.state) {
          case 'successful':
            acc.successful.push(result);
            break;
          case 'unauthorized':
            acc.unauthorized.push(result);
            break;
          case 'unauthenticated':
            acc.unauthenticated.push(result);
            break;
        }
        return acc;
      },
      {
        successful: [],
        unauthorized: [],
        unauthenticated: [],
      },
    );
    if (resultsByState.unauthorized.length > 0) {
      return { state: 'unauthorized', authentications: authenticationResults };
    } else if (resultsByState.unauthenticated.length > 0) {
      return { state: 'unauthenticated', authentications: authenticationResults };
    } else {
      const authContext = this.principalMergeService.mergePrincipals(
        resultsByState.successful.map(result => result.principal),
      );
      return { state: 'successful', authContext, authentications: authenticationResults };
    }
  }
}
