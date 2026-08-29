import { HttpRequest } from '@azure/functions';
import { Principal } from 'security';
import { serviceIdentifier } from 'shared';

/**
 * Service identifier for the AuthenticationService. This service is responsible for authenticating incoming HTTP requests and returning a Principal object representing the authenticated user.
 * It can be used to implement custom authentication logic, such as validating JWT tokens, API keys, or other authentication mechanisms.
 */
export const AUTHENTICATION_SERVICE = serviceIdentifier<AuthenticationService>('AzFunctions.AuthenticationService');
export const REST_APPLICATION_TAG_KEY = Symbol.for('AzFunctions.RestApplicationTagKey');

/**
 * Interface representing an authentication service that can authenticate incoming HTTP requests.
 * The service should implement the `authenticate` method, which takes an HttpRequest and returns a Promise that resolves to a Principal object representing the authenticated user.
 */
export interface AuthenticationService {
  authenticate(request: HttpRequest): Promise<Principal>;
}
