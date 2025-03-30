import { Container, inject, injectable } from 'inversify';
import * as _ from 'lodash';
import { SecurityRequirementObject, SecuritySchemeObject } from 'openapi3-ts/oas30';
import { PLATFORM_CONTAINER } from 'shared';
import { HttpControllerDefinitionError } from '../http-controller-platform.model';
import { AuthenticationService } from './authentication-service';
import { SECURITY_OBJECT, SecurityObject } from './model';

export interface OperationSecurityData {
  operationSecurities?: SecurityRequirementObject[];
  applicationSecurities?: SecurityRequirementObject[];
}

type SecurityObjects = Record<string, SecurityObject>;

export interface AuthenticationSchemeService {
  securityScheme: string;
  authenticationService: AuthenticationService;
}

@injectable()
export class AuthenticationServiceFactory {
  private securityObjects?: SecurityObjects;

  constructor(@inject(PLATFORM_CONTAINER) private readonly platformContainer: Container) {}

  getSecurityScheme(schemeName: string): SecuritySchemeObject | undefined {
    return this.getSecurityObjects()[schemeName]?.scheme;
  }

  private getSecurityObjects(): SecurityObjects {
    if (!this.securityObjects) {
      const securityObjects = this.platformContainer.isBound(SECURITY_OBJECT)
        ? this.platformContainer.getAll<SecurityObject>(SECURITY_OBJECT)
        : [];
      this.securityObjects = securityObjects.reduce<SecurityObjects>((data, securityObject) => {
        data[securityObject.name] = securityObject;
        return data;
      }, {});
    }
    return this.securityObjects;
  }

  getAuthenticationServices(operationSecurityData: OperationSecurityData): AuthenticationSchemeService[] {
    const { operationSecurities, applicationSecurities } = operationSecurityData;
    let securitySchemes: string[] = [];
    if (operationSecurities && operationSecurities.length > 0) {
      securitySchemes = operationSecurities.flatMap(security => Object.keys(security));
    } else if (applicationSecurities?.length) {
      securitySchemes = applicationSecurities.flatMap(security => Object.keys(security));
    }
    return _.uniq(securitySchemes).map(securityScheme => ({
      securityScheme,
      authenticationService: this.getAuthenticationService(securityScheme),
    }));
  }

  private getAuthenticationService(securityContextName: string): AuthenticationService {
    const authenticationService = this.getSecurityObjects()[securityContextName];
    if (!authenticationService) {
      throw new HttpControllerDefinitionError(`Security context provider "${securityContextName}" is not registered.`);
    }
    return authenticationService;
  }
}
