import { LOGGER_FACTORY, LoggerFactory } from '@herrromich/az-functions';
import { Transactional } from '@herrromich/transaction-manager';
import { inject, injectable } from 'inversify';
import { Selectable } from 'kysely';
import { FleetSightDatasource } from '../../persistence';
import { CustomerTable } from '../../persistence/features/orders';

export type Customer = Selectable<CustomerTable>;

@injectable()
@Transactional()
export class CustomersRepository {
  private readonly logger;

  constructor(
    @inject(LOGGER_FACTORY) loggerFactory: LoggerFactory,
    private readonly db: FleetSightDatasource,
  ) {
    this.logger = loggerFactory();
  }

  @Transactional()
  async getCustomers(): Promise<Customer[]> {
    this.logger.debug('Fetching all customers.');
    const customers = await this.db.selectFrom('customer').selectAll().execute();
    this.logger.debug(`Fetched ${customers.length} customers successfully.`, { customers });
    return customers;
  }

  @Transactional()
  async tryGetCustomerById(customerId: string): Promise<{ id: string; name: string } | undefined> {
    this.logger.debug(`Fetching customer with id=${customerId}.`);
    const customer = await this.db
      .selectFrom('customer')
      .select(['id', 'name'])
      .where('id', '=', customerId)
      .executeTakeFirst();
    if (customer) {
      this.logger.debug(`Found customer with id=${customerId}.`, { customer });
    } else {
      this.logger.debug(`No customer found with id=${customerId}.`);
    }
    return customer;
  }
}
