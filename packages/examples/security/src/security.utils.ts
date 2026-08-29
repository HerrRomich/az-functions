import { Permission, PermissionAssignments, Permissions, Role, Roles } from './security.model';

export function validateRoles(roles: string[]): Roles {
  return roles.reduce<Roles>((acc, role) => {
    if (Roles.includes(role as Role)) {
      acc[role as Role] = true;
    }
    return acc;
  }, {});
}

export function getPermissionsForRoles(roles: Roles): Permissions {
  return Object.keys(roles).reduce<Permissions>((acc, role) => {
    const rolePermissions = PermissionAssignments[role as Role];
    Object.keys(rolePermissions).forEach(permission => {
      acc[permission as Permission] = true;
    });
    return acc;
  }, {});
}
