import { Generated } from 'kysely';

export interface CustomerTable {
  id: Generated<number>;
  name: string;
  email: string;
  phoneNumber: string;
}
