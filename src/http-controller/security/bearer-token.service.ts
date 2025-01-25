import { UserAccount } from 'shared';

export interface BearerTokenService {
  readonly bearerFormat: string;
  getUserAccountFromToken(accessToken: string): UserAccount | PromiseLike<UserAccount>;
}
