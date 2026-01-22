import { Generated } from 'kysely';

export interface DriverTable {
  id: Generated<string>;
  name: string;
  surname: string;
  licenseNumber: string;
  phoneNumber: string;
  email: string;
  runId: string | null;
}
