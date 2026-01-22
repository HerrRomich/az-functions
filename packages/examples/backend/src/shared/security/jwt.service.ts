import { AuthenticationError } from '@herrromich/az-functions';
import { inject, injectable } from 'inversify';
import * as jwt from 'jsonwebtoken';
import { JwtHeader, SigningKeyCallback } from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';
import { APP_CONFIG, AppConfig } from '../app-config';

@injectable()
export class JwtService {
  private readonly client: JwksClient;
  private readonly tenantId: string;
  private readonly apiClientId: string;

  constructor(
    @inject(APP_CONFIG)
    appConfig: AppConfig,
  ) {
    this.tenantId = appConfig.tenantId;
    this.apiClientId = appConfig.apiClientId;
    this.client = new JwksClient({
      jwksUri: `https://login.microsoftonline.com/${this.tenantId}/discovery/v2.0/keys`,
    });
  }

  getKey(header: JwtHeader, callback: SigningKeyCallback) {
    this.client.getSigningKey(header.kid, (err, key) => {
      if (err) return callback(err);
      const signingKey = key?.getPublicKey();
      callback(null, signingKey);
    });
  }

  async verifyToken(token: string): Promise<jwt.JwtPayload> {
    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        this.getKey.bind(this),
        {
          audience: `api://${this.apiClientId}`,
          issuer: `https://sts.windows.net/${this.tenantId}/`,
          algorithms: ['RS256'],
        },
        (err, decoded) => {
          if (err !== null) {
            reject(new AuthenticationError('Error verifying JWT token', { cause: err }));
          } else if (decoded === undefined || typeof decoded === 'string') {
            reject(new AuthenticationError('Invalid JWT token'));
          } else {
            resolve(decoded);
          }
        },
      );
    });
  }
}
