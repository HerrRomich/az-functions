import { HttpRequest } from '@azure/functions';
import { AuthenticationError, Principal } from 'security';
import { AuthenticationService } from './authentication-service';
import { BearerTokenService } from './bearer-token.service';

export class BearerSecurityAuthenticationService implements AuthenticationService {
  constructor(private readonly bearerTokenService: BearerTokenService) {}

  async authenticate(request: HttpRequest): Promise<Principal> {
    const [bearerHeader, bearerToken] = request.headers.get('Authorization')?.split(' ') ?? [];
    if (bearerHeader !== 'Bearer' || !bearerToken) {
      throw new AuthenticationError('No Bearer token in Authorization header.');
    }
    return this.bearerTokenService.getPrincipalFromToken(bearerToken);
  }
}
