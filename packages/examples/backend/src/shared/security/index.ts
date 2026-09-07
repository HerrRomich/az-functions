import { AUTHENTICATION_SERVICE } from '@herrromich/az-functions';
import { ContainerModule } from 'inversify';
import { SecuritySchemeObject } from 'openapi3-ts/oas30';
import { BearerAuthenticationService } from './bearer-authentication.service';
import { JwtService } from './jwt.service';

export const BEARER_HTTP_AUTHENTICATION = 'bearerHttpAuthentication';
export const SharedSecuritySchemes = {
  [BEARER_HTTP_AUTHENTICATION]: {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  },
} as const satisfies Record<string, SecuritySchemeObject>;

export const SecurityModule = new ContainerModule(({ bind }) => {
  bind(JwtService).toSelf();
  bind(AUTHENTICATION_SERVICE).to(BearerAuthenticationService).whenNamed(BEARER_HTTP_AUTHENTICATION);
});
