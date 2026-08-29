import { inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MsalBroadcastService, MsalService } from '@azure/msal-angular';
import { getPermissionsForRoles, UserAccount, validateRoles } from 'example-security';
import { jwtDecode, JwtPayload } from 'jwt-decode';
import { concatMap, filter, map } from 'rxjs';
import { FleetSightConfigService } from '../config/fleet-sight-config.service';

export interface ApiTokenClaims extends JwtPayload {
  oid: string;
  email: string;
  name: string;
  roles?: string[];
}

@Injectable()
export class UserAccountService {
  private readonly broadcastService = inject(MsalBroadcastService);
  private readonly fleetSightConfig = inject(FleetSightConfigService);
  private readonly authService = inject(MsalService);

  readonly userAccount = toSignal(
    this.broadcastService.inProgress$.pipe(
      filter(inProgress => inProgress === 'none'),
      concatMap(() => {
        if (this.authService.instance.getActiveAccount() === null) {
          this.authService.instance.setActiveAccount(this.authService.instance.getAllAccounts()[0] ?? null);
        }
        const scope = `api://${this.fleetSightConfig.config.API_REGISTRATION_ID}/.default`;
        return this.authService
          .acquireTokenSilent({ scopes: [scope] })
          .pipe(map(({ accessToken }): UserAccount => this.tokenToUserAccount(accessToken)));
      }),
    ),
  );
  private tokenToUserAccount(accessToken: string): UserAccount {
    const jwtPayload = jwtDecode<ApiTokenClaims>(accessToken);
    const roles = validateRoles(jwtPayload.roles ?? []);
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
