import { PLATFORM_CONTEXT_MANAGER, PlatformContextManager } from 'context';
import { inject, injectable } from 'inversify';
import { AuthContext, AUTHENTICATION_CONTEXT_KEY } from './security.model';

/**
 * SecurityContext provides access to the current authentication context.
 *
 * It retrieves the authentication information from the platform context manager, which is typically set up during the request handling process.
 *
 * Usage:
 *
 * ```ts
 * const securityContext = container.get(SecurityContext);
 * const authContext = securityContext.getAuthentication();
 * if (authContext) {
 *   // Access user information, roles, etc.
 * }
 * ```
 */
@injectable()
export class SecurityContext {
  constructor(
    @inject(PLATFORM_CONTEXT_MANAGER)
    private readonly contextManager: PlatformContextManager,
  ) {}

  getAuthentication(): AuthContext | undefined {
    return this.contextManager.active()?.getValue(AUTHENTICATION_CONTEXT_KEY);
  }
}
