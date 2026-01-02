import {
  httpController,
  httpGet,
  httpPathParam,
  Logger,
  LOGGER_FACTORY,
  LoggerFactory,
  NotFoundError,
} from '@herrromich/az-functions';
import { transactional } from '@herrromich/transaction-manager';
import { inject } from 'inversify';
import { DashboardRepository } from 'shared/persistence/features/fleet/dashboard.repository';
import { z } from 'zod';
import { CONSOLE_API } from '../console-api.application';
import { TruckDto, TruckDtoSchema, TrucksResponseDto, TrucksResponseDtoSchema } from './dashboard.dto';
import { DashboardMapper } from './dashboard.mapper';

@httpController({
  application: CONSOLE_API,
  path: '/dashboard/trucks',
  tags: ['DashboardService'],
})
@transactional()
export class DashboardController {
  private readonly logger: Logger;

  constructor(
    @inject(LOGGER_FACTORY) loggerFactory: LoggerFactory,
    private readonly dashboardRepository: DashboardRepository,
    private readonly mapper: DashboardMapper,
  ) {
    this.logger = loggerFactory();
  }

  @httpGet({
    description: 'Retrieve a list of all trucks',
    response: {
      description: 'A list of trucks',
      contentSchema: TrucksResponseDtoSchema,
    },
  })
  async getTrucks(): Promise<TrucksResponseDto> {
    this.logger.info('Fetching all trucks from the repository');
    const trucks = await this.dashboardRepository.getAllTrucksWithDrivers();
    const response: TrucksResponseDto = {
      items: trucks.map(truck => this.mapper.toDto(truck)),
      totalCount: trucks.length,
    };
    this.logger.info(`Fetched ${response.totalCount} trucks`);
    this.logger.debug('DashboardService response:', response);
    return response;
  }

  @httpGet({
    path: '/{truckId}',
    description: 'Retrieve a single truck by ID',
    response: {
      description: 'A single truck',
      contentSchema: TruckDtoSchema,
    },
  })
  async getTruck(@httpPathParam({ name: 'truckId', schema: z.number() }) truckId: number): Promise<TruckDto> {
    this.logger.info(`Fetching truck with ID: ${truckId} from the repository`);
    const truck = await this.dashboardRepository.getTruckById(truckId);
    if (truck === undefined) {
      this.logger.warn(`Truck with ID: ${truckId} not found`);
      throw new NotFoundError(`Truck with ID ${truckId} not found`);
    }
    const response: TruckDto = this.mapper.toDto(truck);
    this.logger.info(`Fetched truck with ID: ${response.id}`);
    this.logger.debug('Truck response:', response);
    return response;
  }
}
