import { EventHubService } from '@fleet-sight/shared/event-nub';
import { Body, HttpController, Post } from '@herrromich/az-functions';
import { EVENT_HUB_API } from './event-hub-api.application';
import { TruckTelemetryDto, TruckTelemetryDtoSchema } from './event-hub.dto';

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
