import { injectable } from 'inversify';
import { AuthContext, AuthenticationError, Principal } from 'security';
import { PrincipalMergeService } from './principal-merge.service';

@injectable()
export class StrictPrincipalMergeService implements PrincipalMergeService {
  mergePrincipals(principals: Principal[]): AuthContext {
    const firstPrincipal = principals[0] ?? null;
    const principalScopes = new Set(firstPrincipal?.scopes ?? []);
    for (const principal of principals) {
      if (principal.subject !== firstPrincipal?.subject || principal.type !== firstPrincipal?.type) {
        throw new AuthenticationError('AuthContext subject or type mismatch during merge', {
          details: {
            firstPrincipal,
            principal,
          },
        });
      }
      principal.scopes.forEach(scope => principalScopes.add(scope));
    }
    return { principal: firstPrincipal, principals: principals, scopes: Array.from(principalScopes) };
  }
}
