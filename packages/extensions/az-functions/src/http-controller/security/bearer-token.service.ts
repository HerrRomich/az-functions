import { Principal } from 'security';

export interface BearerTokenService {
  readonly bearerFormat: string;
  getPrincipalFromToken(accessToken: string): Principal | PromiseLike<Principal>;
}
