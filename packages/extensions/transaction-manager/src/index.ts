import { Kysely } from 'kysely';

export { transactional } from './decorators';
export { registerDataSource, TransactionManagerError } from './transaction-manager.module';

export class DataSource<DB> extends Kysely<DB> {}
