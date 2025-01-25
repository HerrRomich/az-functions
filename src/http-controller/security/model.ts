import { SecuritySchemeObject } from 'openapi3-ts/oas30';
import { AuthenticationService } from './authentication-service';

export class AuthenticationError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export const SECURITY_OBJECT = Symbol.for('SECURITY_OBJECT');

export interface SecurityObject extends AuthenticationService {
  readonly name: string;
  readonly scheme: SecuritySchemeObject;
}
