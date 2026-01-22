import { SYSTEM_USER_ACCOUNT } from '@herrromich/az-functions';
import { Container } from 'inversify';
import { SecurityModule } from './index';

describe('Security', () => {
  describe('SecurityModule', () => {
    let container: Container;

    beforeEach(() => {
      container = new Container({ defaultScope: 'Singleton' });
    });

    it('should load SecurityModule without errors', () => {
      container.loadSync(SecurityModule);

      const systemUserAccount = container.get(SYSTEM_USER_ACCOUNT);

      expect(systemUserAccount).toBeDefined();
      expect(systemUserAccount.isAdmin).toBe(true);
      expect(systemUserAccount.permissions).toEqual([]);
    });
  });
});
