import { Container } from 'inversify';
import * as path from 'path';
import { BASE_DIR, sharedModule, SYSTEM_USER_ACCOUNT, UserAccount } from './index';

describe('shared module', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container({ defaultScope: 'Singleton' });
    container.load(sharedModule);
  });

  describe('BASE_DIR', () => {
    it('should get the base directory', () => {
      const baseDir = container.get<string>(BASE_DIR);

      expect(baseDir).toEqual(path.resolve(__dirname, '.'));
    });
  });

  describe('SYSTEM_USER_ACCOUNT', () => {
    it('should get the system user account', () => {
      const systemUserAccount = container.get<UserAccount>(SYSTEM_USER_ACCOUNT);

      expect(systemUserAccount).toMatchObject({
        oid: '00000000-0000-0000-0000-000000000000',
        username: 'system',
        name: 'Admin Center System User',
        isAdminUser: false,
        isSystemUser: true,
        permissions: [],
      });
    });
  });
});
