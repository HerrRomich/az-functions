import { HttpResponseInit } from '@azure/functions';
import { CustomerUsersService } from '@fleet-sight/shared/applications/customers';
import { CustomersRepository, OrdersRepository } from '@fleet-sight/shared/applications/orders';
import { Pagination } from '@fleet-sight/shared/persistence';
import { IdDtoSchema } from '@fleet-sight/shared/rest';
import { typedKeys } from '@fleet-sight/shared/utils';
import {
  AuthContext,
  AuthCtx,
  BadRequestError,
  Body,
  Get,
  HttpController,
  HttpDirectResponseBuilder,
  Logger,
  LOGGER_FACTORY,
  LoggerFactory,
  NotFoundError,
  NumberSchema,
  Post,
  QueryParam,
} from '@herrromich/az-functions';
import { Transactional } from '@herrromich/transaction-manager';
import { UserAccount } from 'example-security';
import { inject } from 'inversify';
import { z } from 'zod';
import { ORDERS_API } from './orders-api.application';
import {
  OrderCreateRequestDto,
  OrderCreateRequestDtoSchema,
  OrderDto,
  OrderDtoSchema,
  OrdersResponse,
  OrdersResponseSchema,
  OrderStatus,
  OrderStatusScheme,
} from './orders.dto';
import { OrdersMapper } from './orders.mapper';

@HttpController({
  application: ORDERS_API,
  path: '/orders',
  tags: ['Orders'],
})
export class OrdersController {
  private readonly logger: Logger;

  constructor(
    @inject(LOGGER_FACTORY) loggerFactory: LoggerFactory,
    private readonly customerUsersService: CustomerUsersService,
    private readonly ordersRepository: OrdersRepository,
    private readonly ordersMapper: OrdersMapper,
    private readonly customersRepository: CustomersRepository,
  ) {
    this.logger = loggerFactory();
  }

  @Get({
    description: 'Get orders based on filters with pagination',
    directResponse: {
      status: 202,
      description: 'Get orders directResponse',
      jsonContent: { schema: OrdersResponseSchema },
    },
  })
  @Transactional()
  async getOrders(
    @AuthCtx() authContext: AuthContext,
    @QueryParam({
      name: 'scheduledAtFrom',
      schema: z.iso.datetime({ offset: true }).optional().openapi({
        description: 'Filter orders scheduled from this date (inclusive)',
      }),
    })
    scheduledAtFrom: string | undefined,
    @QueryParam({
      name: 'scheduledAtTo',
      schema: z.iso.datetime({ offset: true }).optional().openapi({
        description: 'Filter orders scheduled to this date (inclusive)',
      }),
    })
    scheduledAtTo: string | undefined,
    @QueryParam({
      name: 'status',
      schema: OrderStatusScheme.array().openapi({
        description: 'Filter orders by their status',
      }),
    })
    status: OrderStatus[],
    @QueryParam({
      name: 'offset',
      schema: NumberSchema.optional().openapi({
        description: 'Number of items to skip for pagination',
      }),
    })
    offset: number | undefined,
    @QueryParam({
      name: 'limit',
      schema: NumberSchema.optional().openapi({
        description: 'Maximum number of items to return',
      }),
    })
    limit: number | undefined,
  ): Promise<OrdersResponse> {
    this.logger.info('Fetching orders.');
    const pagination: Pagination = {
      limit: limit ?? 50,
      offset: offset ?? 0,
    };
    this.logger.debug('Fetching orders with pagination.', { pagination, scheduledAtFrom, scheduledAtTo, status });
    const userAccount = authContext.principal! as UserAccount;
    const customersForUser = await this.customerUsersService.getCustomersForUser(userAccount.subject);
    const filter = {
      scheduledAtFrom: scheduledAtFrom !== undefined ? new Date(scheduledAtFrom) : undefined,
      scheduledAtTo: scheduledAtTo !== undefined ? new Date(scheduledAtTo) : undefined,
      statusIn:
        status.length > 0
          ? status.reduce<Partial<Record<OrderStatus, true>>>((acc, curr) => {
              acc[curr] = true;
              return acc;
            }, {})
          : undefined,
    };
    const customerIds = typedKeys(customersForUser);
    this.logger.verbose(
      `Fetching orders:
 • pagination: ${JSON.stringify(pagination)},
 • customerIds: ${JSON.stringify(customerIds)},
 • filter: ${JSON.stringify(filter)}`,
    );
    const orders = await this.ordersRepository.getOrders(pagination, customerIds, filter);
    const responseDto = {
      items: orders.items.map(order => this.ordersMapper.toDto(order)),
      offset: pagination.offset,
      count: orders.items.length,
      total: orders.total,
    };
    this.logger.info('Fetched orders successfully');
    this.logger.debug(`Fetched ${orders.items.length} orders successfully.`, { orders: responseDto.items });
    return responseDto;
  }

  @Get({
    path: '{:orderId}',
    description: 'Get order by ID',
    directResponse: {
      status: 200,
      description: 'Get order by ID directResponse',
      jsonContent: { schema: OrderDtoSchema },
      headers: z.object({
        Location: z.url().openapi({
          description: 'URL of the order resource',
        }),
      }),
    },
    responses: {
      '404': {
        description: 'Order not found error',
      },
    },
  })
  @Transactional()
  async getOrderById(
    @AuthCtx() authContext: AuthContext,
    @QueryParam({
      name: 'orderId',
      schema: IdDtoSchema.openapi({
        description: 'Unique identifier of the order',
      }),
    })
    orderId: string,
  ): Promise<OrderDto> {
    this.logger.info('Fetching order.');
    const userAccount = authContext.principal! as UserAccount;
    const customersForUser = await this.customerUsersService.getCustomersForUser(userAccount.subject);
    const customerIds = typedKeys(customersForUser);
    this.logger.debug(`Fetching order by id=${orderId}.`, {
      subject: userAccount.subject,
      customerIds,
    });
    this.logger.silly(`Fetching order by id=${orderId}.`, {
      subject: userAccount.subject,
      customers: customersForUser,
    });
    const order = await this.ordersRepository.getOrderById(customerIds, orderId);
    if (!order) {
      throw new NotFoundError(`Order with id=${orderId} not found`);
    }

    this.logger.info('Fetched order successfully');
    this.logger.debug(`Fetched order by id=${order.id}.`, {
      order,
    });
    return this.ordersMapper.toDto(order);
  }

  @Post({
    description: 'Create a new order',
    directResponse: {
      status: 201,
      description: 'Order created successfully',
      jsonContent: { schema: OrderDtoSchema },
      headers: z.object({
        Location: z.url().openapi({
          description: 'URL of the created order',
        }),
      }),
    },
    responses: {
      '400': {
        description: 'Bad request error',
      },
    },
  })
  @Transactional()
  async createOrder(
    @AuthCtx() authContext: AuthContext,
    @Body({
      description: 'Order create request',
      schema: OrderCreateRequestDtoSchema,
    })
    createOrderRequestDto: OrderCreateRequestDto,
  ): Promise<HttpResponseInit> {
    this.logger.info('Creating a new order.');

    const customer = await this.customersRepository.tryGetCustomerById(createOrderRequestDto.customerId);
    if (!customer) {
      throw new BadRequestError(`Customer with id=${createOrderRequestDto.customerId} not found.`);
    }
    const userAccount = authContext.principal! as UserAccount;
    const customersForUser = await this.customerUsersService.getCustomersForUser(userAccount.subject);
    if (!(customer.id in customersForUser)) {
      throw new BadRequestError(
        `User with subject=${userAccount.subject} does not have access to customer with id=${customer.id}.`,
      );
    }
    const order = this.ordersMapper.fromCreateDto(createOrderRequestDto);
    this.logger.debug(`Creating a new order for customer id=${customer.id}.`, {
      subject: userAccount.subject,
      customer,
      order,
    });

    const createdOrder = await this.ordersRepository.createOrder(order);
    this.logger.info(`Created order with id=${createdOrder.id} successfully.`);
    this.logger.debug('Created order successfully.', {
      order: createdOrder,
    });
    const responseDto = this.ordersMapper.toDto({
      ...createdOrder,
      customerId: customer.id,
      customerName: customer.name,
    });
    return HttpDirectResponseBuilder.builder<OrderDto>()
      .header('Location', `/orders/${responseDto.id}`)
      .jsonBody(responseDto)
      .build();
  }
}
