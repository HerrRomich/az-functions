export interface UserAccount {
  readonly oid: string;
  readonly username: string;
  readonly name: string;
  readonly isAdminUser: boolean;
  readonly isSystemUser: boolean;
  readonly permissions: readonly string[];
}

export const SYSTEM_USER_ACCOUNT = Symbol.for('SYSTEM_USER_ACCOUNT');

export const systemUserAccount: UserAccount = {
  oid: '00000000-0000-0000-0000-000000000000',
  username: 'system',
  name: 'Admin Center System User',
  isAdminUser: false,
  isSystemUser: true,
  permissions: [],
};
