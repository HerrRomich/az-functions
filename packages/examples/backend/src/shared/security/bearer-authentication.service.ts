import { HttpRequest } from '@azure/functions';
import { AuthenticationError, AuthenticationService } from '@herrromich/az-functions';
import { getPermissionsForRoles, UserAccount, validateRoles } from 'example-security';
import { injectable } from 'inversify';
import { JwtService } from './jwt.service';

@injectable()
export class BearerAuthenticationService implements AuthenticationService {
  constructor(private readonly jwtService: JwtService) {}

  async authenticate(request: HttpRequest): Promise<UserAccount> {
    const authHeader = request.headers.get('authorization');
    if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Invalid or missing Authorization Bearer token');
    }
    const token = authHeader?.split(' ')[1] ?? '';
    const jwtPayload = await this.jwtService.verifyToken(token);
    const roles = validateRoles(jwtPayload.roles);
    const permissions = getPermissionsForRoles(roles);
    return {
      subject: jwtPayload.oid,
      type: 'user-account',
      scheme: 'bearer',
      username: jwtPayload.email,
      name: jwtPayload.name,
      roles,
      permissions,
      scopes: Object.keys(permissions),
    };
  }
}
