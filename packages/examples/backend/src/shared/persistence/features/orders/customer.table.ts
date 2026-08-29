import { Generated } from 'kysely';

export interface CustomerTable {
  id: Generated<string>;
  name: string;
  email: string;
  phoneNumber: string;
}
