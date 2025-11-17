import { SecuritySchemeObject } from 'openapi3-ts/oas30';
import { AzureFunctionError } from 'shared';
import { AuthenticationService } from './authentication-service';

export class AuthenticationError extends AzureFunctionError {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
  }
}

export const SECURITY_OBJECT = Symbol.for('SECURITY_OBJECT');

export interface SecurityObject extends AuthenticationService {
  readonly name: string;
  readonly scheme: SecuritySchemeObject;
}
