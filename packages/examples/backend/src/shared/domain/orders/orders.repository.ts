import { LOGGER_FACTORY, LoggerFactory } from '@herrromich/az-functions';
import { Transactional } from '@herrromich/transaction-manager';
import { inject, injectable } from 'inversify';
import { Expression, Selectable, SqlBool } from 'kysely';
import { FleetSightDatasource, Pagination, RepositoryObjectWithTotal } from '../../persistence';
import { OrderTable } from '../../persistence/features/orders';
import { typedKeys } from '../../utils';

export interface OrdersFilter {
  scheduledAtFrom?: Date;
  scheduledAtTo?: Date;
  statusIn?: Partial<Record<OrderTable['status'], true>>;
}

export type Order = Selectable<OrderTable>;
export type OrderWithCustomer = Order & { customerId: string; customerName: string };

export type OrdersWithTotal = RepositoryObjectWithTotal<OrderWithCustomer>;

export type CreateOrder = Omit<OrderTable, 'id' | 'updatedAt' | 'truckRunId'>;

@injectable()
@Transactional()
export class OrdersRepository {
  private readonly logger;

  constructor(
    @inject(LOGGER_FACTORY) loggerFactory: LoggerFactory,
    private readonly db: FleetSightDatasource,
  ) {
    this.logger = loggerFactory();
  }

  @Transactional()
  async getOrders(
    pagination: Pagination,
    customerIds: string[] | undefined,
    filter: OrdersFilter,
  ): Promise<OrdersWithTotal> {
    let selectQueryBuilder = this.prepareOrdersSelectQuery(customerIds);

    selectQueryBuilder = selectQueryBuilder.where(eb => {
      const ors: Expression<SqlBool>[] = [];
      if (filter.scheduledAtFrom) {
        ors.push(eb('scheduledAt', '>=', filter.scheduledAtFrom));
      }
      if (filter.scheduledAtTo) {
        ors.push(eb('scheduledAt', '<=', filter.scheduledAtTo));
      }
      if (filter.statusIn) {
        const statuses = typedKeys(filter.statusIn);
        ors.push(eb('status', 'in', statuses));
      }
      return eb.and(ors);
    });
    const total = (
      await selectQueryBuilder.select(eb => [eb.fn.countAll<number>().as('total')]).executeTakeFirstOrThrow()
    ).total;
    selectQueryBuilder = selectQueryBuilder.offset(pagination.offset).limit(pagination.limit);
    selectQueryBuilder = selectQueryBuilder.orderBy('scheduledAt', 'desc');
    const items = await selectQueryBuilder
      .selectAll('order')
      .select(['customer.id as customerId', 'customer.name as customerName'])
      .execute();
    return {
      items: items,
      total: total,
    };
  }

  private prepareOrdersSelectQuery(customerIds: string[] | undefined) {
    let selectQueryBuilder = this.db.selectFrom('order').innerJoin('customer', 'order.customerId', 'customer.id');
    if (customerIds) {
      selectQueryBuilder = selectQueryBuilder.where('customerId', 'in', customerIds);
    }
    return selectQueryBuilder;
  }

  @Transactional()
  async getOrderById(customerIds: string[] | undefined, orderId: string): Promise<OrderWithCustomer | undefined> {
    let selectQueryBuilder = this.prepareOrdersSelectQuery(customerIds);
    selectQueryBuilder = selectQueryBuilder.where('order.id', '=', orderId);

    return await selectQueryBuilder
      .selectAll('order')
      .select(['customer.id as customerId', 'customer.name as customerName'])
      .executeTakeFirst();
  }

  @Transactional()
  async createOrder(order: CreateOrder): Promise<Order> {
    return await this.db.insertInto('order').values(order).returningAll().executeTakeFirstOrThrow();
  }
}
