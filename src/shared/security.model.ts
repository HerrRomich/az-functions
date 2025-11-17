import { ServiceIdentifier } from 'inversify';

/**
 * Model representing a user account with associated permissions.
 * This interface is used for authentication and authorization purposes.
 * It includes a list of permissions that define the actions the user is allowed to perform.
 */
export interface UserAccount {
  readonly isAdmin: boolean;
  readonly permissions: readonly string[];
}

/**
 * Symbol used to identify the system user account.
 * This can be used in dependency injection or service locators to refer to a special user account
 * that represents the system internal processes, often with elevated permissions.
 */
export const SYSTEM_USER_ACCOUNT: ServiceIdentifier<UserAccount> = Symbol.for('SYSTEM_USER_ACCOUNT');
