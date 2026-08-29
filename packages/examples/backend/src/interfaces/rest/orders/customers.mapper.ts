import { Customer } from '@fleet-sight/shared/applications/orders';
import { injectable } from 'inversify';
import { CustomerDto } from './customers.dto';

@injectable()
export class CustomersMapper {
  toCustomerDto(customer: Customer): CustomerDto {
    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
    };
  }
}
