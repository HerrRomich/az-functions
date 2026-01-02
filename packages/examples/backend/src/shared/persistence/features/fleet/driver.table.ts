import { Generated } from 'kysely';

export interface DriverTable {
  id: Generated<number>;
  name: string;
  surname: string;
  licenseNumber: string;
  phoneNumber: string;
  email: string;
}
