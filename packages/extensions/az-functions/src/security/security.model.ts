import { createPlatformContextValueKey } from 'context';
import { AzFunctionsErrorOptions, AzFunctionsRuntimeError } from 'shared';

/**
 *
 */
export class AuthenticationError extends AzFunctionsRuntimeError {
  constructor(message?: string, options?: AzFunctionsErrorOptions) {
    super(message, options);
  }
}

/**
 * Represents an authenticated principal in the authentication context.
 * @property {string} subject - The unique identifier of the principal (e.g., user ID).
 * @property {string} type - The type of the principal (e.g., "user", "service").
 * @property {string} scheme - The authentication scheme used for the principal (e.g., "bearer", "basic").
 * @property {string[]} scopes - An array of scopes associated with the principal.
 * @property {Record<string, unknown>} [meta] - Optional additional metadata about the principal.
 */
export interface Principal {
  subject: string;
  type: string;
  scheme: string;
  scopes: string[];
  meta?: Record<string, unknown>;
}

/**
 * Represents the authentication context for a request.
 * @property {Principal | null} principal - The primary authenticated principal, or null if not authenticated.
 * @property {Principal[]} principals - An array of all principals associated with the request.
 * @property {string[]} scopes - An array of scopes associated with the authenticated principal.
 */
export interface AuthContext {
  principal: Principal | null;
  principals: Principal[];
  scopes: string[];
}

/**
 * A unique key for accessing the authentication context in the platform context.
 */
export const AUTHENTICATION_CONTEXT_KEY = createPlatformContextValueKey<AuthContext>(
  'AzFunctions.ContextKey.Authentication',
);
