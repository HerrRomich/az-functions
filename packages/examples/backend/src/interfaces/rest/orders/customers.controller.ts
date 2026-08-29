import { CustomerUsersService } from '@fleet-sight/shared/applications/customers';
import { CustomersRepository } from '@fleet-sight/shared/applications/orders';
import { AuthContext, AuthCtx, Get, HttpController, LOGGER_FACTORY, LoggerFactory } from '@herrromich/az-functions';
import { Transactional } from '@herrromich/transaction-manager';
import { UserAccount } from 'example-security';
import { inject } from 'inversify';
import { z } from 'zod';
import { CustomerDto, CustomerDtoSchema } from './customers.dto';
import { CustomersMapper } from './customers.mapper';
import { ORDERS_API } from './orders-api.application';

@HttpController({
  application: ORDERS_API,
  path: '/customers',
  tags: ['Customers'],
})
export class CustomersController {
  private readonly logger;
  constructor(
    @inject(LOGGER_FACTORY) loggerFactory: LoggerFactory,
    private readonly customerUsersService: CustomerUsersService,
    private readonly customersRepository: CustomersRepository,
    private readonly customersMapper: CustomersMapper,
  ) {
    this.logger = loggerFactory();
  }

  @Get({
    description: 'Get customers',
    directResponse: {
      status: 200,
      description: 'List of customers accessible to the AuthContext',
      jsonContent: { schema: z.array(CustomerDtoSchema) },
    },
  })
  @Transactional()
  async getCustomers(@AuthCtx() authContext: AuthContext): Promise<CustomerDto[]> {
    const userAccount = authContext.principal! as UserAccount;
    this.logger.info(`Fetching customers for user id ${userAccount.subject}`);
    const customersForUser = await this.customerUsersService.getCustomersForUser(userAccount.subject);
    const customers = await this.customersRepository.getCustomers();
    const response = customers
      .filter(customer => customer.id in customersForUser)
      .map(customer => this.customersMapper.toCustomerDto(customer));
    this.logger.info(`Fetched ${response.length} customers for user id ${userAccount.subject}.`);
    this.logger.debug(`Fetched ${response.length} customers for user id ${userAccount.subject}.`, {
      customers: response,
    });
    return response;
  }
}
