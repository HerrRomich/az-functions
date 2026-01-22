import { HttpResponseInit } from '@azure/functions';
import { TrucksRepository } from '@fleet-sight/shared/applications/fleet';
import { IdDtoSchema } from '@fleet-sight/shared/rest';
import { BEARER_HTTP_AUTHENTICATION } from '@fleet-sight/shared/security/index';
import {
  AzFunctionsRuntimeError,
  BadRequestError,
  Delete,
  Get,
  HttpController,
  HttpDirectResponseBuilder,
  Logger,
  LOGGER_FACTORY,
  LoggerFactory,
  NotFoundError,
  PathParam,
} from '@herrromich/az-functions';
import { Transactional } from '@herrromich/transaction-manager';
import { inject } from 'inversify';
import { CONSOLE_API } from '../console-api.application';
import { TruckDto, TruckDtoSchema, TrucksDto, TrucksDtoSchema } from './trucks.dto';
import { TrucksMapper } from './trucks.mapper';

@HttpController({
  application: CONSOLE_API,
  path: '/trucks',
  tags: ['Trucks'],
})
export class TrucksController {
  private readonly logger: Logger;

  constructor(
    @inject(LOGGER_FACTORY) loggerFactory: LoggerFactory,
    private readonly trucksRepository: TrucksRepository,
    private readonly mapper: TrucksMapper,
  ) {
    this.logger = loggerFactory();
  }

  @Get({
    description: 'Retrieve a list of all trucks',
    security: [{ [BEARER_HTTP_AUTHENTICATION]: ['FleetSightPermission.Trucks.Read'] }],
    directResponse: {
      description: 'A list of trucks',
      jsonContent: { schema: TrucksDtoSchema },
    },
  })
  @Transactional()
  async getTrucks(): Promise<TrucksDto> {
    this.logger.info('Fetching all trucks.');
    const trucks = await this.trucksRepository.getAllTrucksWithDrivers();
    const response: TrucksDto = trucks.map(truck => this.mapper.toDto(truck));
    const azFunctionsError = new AzFunctionsRuntimeError('Fetching all trucks failed.', {
      details: {
        a: 'a',
        b: 1,
      },
      cause: new BadRequestError('Original error.', {
        details: {
          c: 'c',
          d: 2,
        },
      }),
    });
    this.logger.error(azFunctionsError);
    this.logger.error('Test', azFunctionsError);
    this.logger.info('Fetched all trucks successfully.');
    this.logger.debug(`Fetched ${trucks.length} trucks successfully.`, { trucks });
    this.logger.silly(`Fetched ${trucks.length} trucks successfully.`, { trucks });
    return response;
  }

  @Get({
    path: '/{truckId}',
    description: 'Retrieve a single truck by ID',
    security: [{ [BEARER_HTTP_AUTHENTICATION]: ['FleetSightPermission.Trucks.Read'] }],
    directResponse: {
      description: 'A single truck',
      jsonContent: { schema: TruckDtoSchema },
    },
    responses: {
      404: {
        description: 'Truck not found',
      },
    },
  })
  @Transactional()
  async getTruck(@PathParam({ name: 'truckId', schema: IdDtoSchema }) truckId: string): Promise<HttpResponseInit> {
    this.logger.info(`Fetching truck by id=${truckId}.`);
    const truck = await this.trucksRepository.getTruckById(truckId);
    if (truck === undefined) {
      throw new NotFoundError('Truck not found.', { details: { id: truckId } });
    }
    const response: TruckDto = this.mapper.toDto(truck);
    this.logger.info(`Truck with id=${truckId} fetched successfully.`);
    this.logger.debug(`Truck with id=${truckId} fetched successfully.`, { truck });
    return HttpDirectResponseBuilder.builder<TruckDto>().jsonBody(response).build();
  }

  @Delete({
    path: '/{truckId}',
    description: 'Delete a truck by ID',
    security: [{ [BEARER_HTTP_AUTHENTICATION]: ['FleetSightPermission.Trucks.Delete'] }],
    directResponse: {
      description: 'Truck deleted successfully',
      status: 204,
    },
    responses: {
      404: {
        description: 'Truck not found',
      },
    },
  })
  @Transactional()
  async deleteTruck(@PathParam({ name: 'truckId', schema: IdDtoSchema }) truckId: string): Promise<void> {
    this.logger.info(`Deleting truck by id=${truckId}`);
    const truck = await this.trucksRepository.getTruckById(truckId);
    if (truck === undefined) {
      throw new NotFoundError('Truck not found.', { details: { id: truckId } });
    }
    this.logger.debug(`Truck with id=${truckId} found. Proceeding to delete`, {
      truck,
    });
    await this.trucksRepository.deleteTruckById(truckId);
    this.logger.info(`Truck with id=${truckId} deleted successfully`);
  }
}
