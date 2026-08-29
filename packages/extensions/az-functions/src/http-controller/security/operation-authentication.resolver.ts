import { RestApplication } from 'http-controller';
import { Container, inject, injectable } from 'inversify';
import { LOGGER_FACTORY, LoggerFactory } from 'logger';
import { SecurityRequirementObject } from 'openapi3-ts/oas30';
import { PLATFORM_CONTAINER } from 'shared';
import { HttpTriggerDefinitionError } from '../http-handler-support.factory';
import { HttpOperationRegistration } from '../http-operations-registration.service';
import { AUTHENTICATION_SERVICE, AuthenticationService, REST_APPLICATION_TAG_KEY } from './authentication-service';
import { AuthenticationHandler } from './authenticator.provider';

export interface SecurityBinding {
  authService: AuthenticationService;
  scopes: string[];
}

export type SecurityBindingObject = Record<string, SecurityBinding>;

@injectable()
export class OperationAuthenticationResolver {
  private readonly logger;

  constructor(
    @inject(LOGGER_FACTORY) loggerFactory: LoggerFactory,
    @inject(PLATFORM_CONTAINER) private readonly platformContainer: Container,
  ) {
    this.logger = loggerFactory();
  }

  getOperationSecurityBindings(registrationData: HttpOperationRegistration): SecurityBindingObject[] {
    const { operationId, application, operationMetadata } = registrationData;
    let security: SecurityRequirementObject[] = [];
    if (operationMetadata.security !== undefined) {
      this.logger.debug(`Found direct security schemes for operation ${operationId}`, {
        security,
      });
      security = operationMetadata.security;
    } else if (application.openApiConfig.security !== undefined) {
      this.logger.debug(
        `No direct security schemes found for operation ${operationId}. Using application-level security schemes`,
        {
          applicationName: application.name,
          security,
        },
      );
      security = application.openApiConfig.security;
    } else {
      this.logger.debug(`No security schemes found for operation ${operationId}`, {
        operationId,
        applicationName: application.name,
      });
      security = [];
    }
    return this.getSecurityBindingObjects(operationId, application, security);
  }

  private getSecurityBindingObjects(
    operationId: string,
    application: RestApplication,
    security: SecurityRequirementObject[],
  ) {
    const securitySchemes = application.openApiConfig.components?.securitySchemes ?? {};
    return security.map(requirement => {
      return Object.entries(requirement).reduce<SecurityBindingObject>((bindings, [scheme, scopes]) => {
        const securityScheme = securitySchemes[scheme];
        if (securityScheme === undefined) {
          throw new HttpTriggerDefinitionError(
            `Security scheme ${scheme} not found in application ${application.name} for operation ${operationId}`,
            {
              details: {
                operationId,
                applicationName: application.name,
                securityScheme: scheme,
                securitySchemes,
              },
            },
          );
        }
        const authenticationService = this.platformContainer.get(AUTHENTICATION_SERVICE, {
          name: scheme,
          tag: {
            key: REST_APPLICATION_TAG_KEY,
            value: application.name,
          },
          optional: true,
        });
        if (authenticationService === undefined) {
          throw new HttpTriggerDefinitionError(
            `Failed resolving authentication service for scheme ${scheme} in application ${application.name}`,
          );
        }
        bindings[scheme] = {
          authService: authenticationService,
          scopes,
        };
        return bindings;
      }, {});
    });
  }

  defaultAuthenticator(registrationData: HttpOperationRegistration): AuthenticationHandler {
    const { operationId } = registrationData;
    return async () => {
      this.logger.info(`No security schemes configured for operation ${operationId}`);
      return {
        principal: null,
        principals: [],
        scopes: [],
      };
    };
  }
}
