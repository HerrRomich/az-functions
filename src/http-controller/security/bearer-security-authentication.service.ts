import { HttpRequest } from '@azure/functions';
import { UserAccount } from 'shared';
import { AuthenticationService } from './authentication-service';
import { BearerTokenService } from './bearer-token.service';
import { AuthenticationError } from './model';

export class BearerSecurityAuthenticationService implements AuthenticationService {
  constructor(private readonly bearerTokenService: BearerTokenService) {}

  async authenticate(request: HttpRequest): Promise<UserAccount> {
    const [bearerHeader, bearerToken] = request.headers.get('Authorization')?.split(' ') ?? [];
    if (bearerHeader !== 'Bearer' || !bearerToken) {
      throw new AuthenticationError(`No Bearer token in Authorization header.`);
    }
    const userAccountFromToken = Promise.resolve(this.bearerTokenService.getUserAccountFromToken(bearerToken));
    return await userAccountFromToken;
  }
}
