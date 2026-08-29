import { EventHubService } from '@fleet-sight/shared/event-nub';
import { Body, HttpController, Post } from '@herrromich/az-functions';
import { z } from 'zod';
import { EVENT_HUB_API } from './event-hub-api.application';

const TruckTelemetryDtoSchema = z
  .object({
    speed: z.number(),
  })
  .openapi('TruckTelemetry');

type TruckTelemetryDto = z.infer<typeof TruckTelemetryDtoSchema>;

@HttpController({
  application: EVENT_HUB_API,
  path: '/event-hub',
  tags: ['EventHub'],
})
export class EventHubController {
  constructor(private readonly eventHubService: EventHubService) {}

  @Post({
    directResponse: {
      description: 'Send a message to the Event Hub',
      status: 204,
    },
  })
  async sendMessage(
    @Body({
      schema: TruckTelemetryDtoSchema,
    })
    message: TruckTelemetryDto,
  ): Promise<void> {
    await this.eventHubService.sendMessage(message);
  }
}
