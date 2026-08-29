import { Roles } from './security.model';
import { getPermissionsForRoles, validateRoles } from './security.utils';

describe('security utils', () => {
  describe('validateRoles', () => {
    it('should return valid roles', () => {
      const roles = ['FleetSight.Administrator', 'FleetSight.Dispatcher', 'invalidRole'];
      const result = validateRoles(roles);
      expect(result).toEqual({ 'FleetSight.Administrator': true, 'FleetSight.Dispatcher': true });
    });
  });

  describe('getPermissionsForRoles', () => {
    it('should return permissions for valid roles', () => {
      const roles: Roles = { 'FleetSight.Administrator': true, 'FleetSight.Dispatcher': true };
      const result = getPermissionsForRoles(roles);
      expect(result).toEqual({
        'FleetSightPermission.Fleet.View': true,
        'FleetSightPermission.Trucks.Read': true,
        'FleetSightPermission.Trucks.Write': true,
      });
    });
  });
});
