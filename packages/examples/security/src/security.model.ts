import { Principal } from '@herrromich/az-functions';

export interface UserAccount extends Principal {
  readonly subject: string;
  readonly type: 'user-account';
  readonly username: string;
  readonly name: string;
  readonly roles: Roles;
  readonly permissions: Permissions;
}

export const Permissions = [
  'FleetSightPermission.Fleet.View',
  'FleetSightPermission.Trucks.Read',
  'FleetSightPermission.Trucks.Write',
] as const;
export type Permission = (typeof Permissions)[number];
export type Permissions = Partial<Record<Permission, true>>;

export const Roles = ['FleetSight.Administrator', 'FleetSight.Dispatcher'] as const;
export type Role = (typeof Roles)[number];
export type Roles = Partial<Record<Role, true>>;

export const PermissionAssignments: Record<Role, Permissions> = {
  'FleetSight.Administrator': Permissions.reduce<Permissions>((acc, permission) => {
    acc[permission] = true;
    return acc;
  }, {}),
  'FleetSight.Dispatcher': {
    'FleetSightPermission.Fleet.View': true,
    'FleetSightPermission.Trucks.Read': true,
  },
};
