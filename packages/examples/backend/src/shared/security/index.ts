import { AUTHENTICATION_SERVICE } from '@herrromich/az-functions';
import { ContainerModule } from 'inversify';
import { SecuritySchemeObject } from 'openapi3-ts/oas30';
import { BearerAuthenticationService } from './bearer-authentication.service';
import { JwtService } from './jwt.service';

export const BEARER_HTTP_AUTHENTICATION = 'bearerHttpAuthentication';
export const SharedSecuritySchemes: Record<string, SecuritySchemeObject> = {
  [BEARER_HTTP_AUTHENTICATION]: {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  },
};

export const SecurityModule = new ContainerModule(({ bind }) => {
  bind(JwtService).toSelf();
  bind(AUTHENTICATION_SERVICE).to(BearerAuthenticationService).whenNamed(BEARER_HTTP_AUTHENTICATION);
});
