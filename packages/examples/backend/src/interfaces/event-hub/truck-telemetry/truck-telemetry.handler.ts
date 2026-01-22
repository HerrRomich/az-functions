import { EVENT_HUB_NAME } from '@fleet-sight/shared/event-nub';
import {
  EventHubHandler,
  EventHubMessageWrapper,
  LOGGER_FACTORY,
  LoggerFactory,
  Messages,
  OnEventHubTrigger,
} from '@herrromich/az-functions';
import { inject } from 'inversify';
import { TruckTelemetryPayload, TruckTelemetryPayloadSchema } from './truck-telemetry.model';

@EventHubHandler({
  connection: 'EventHubConnection',
  eventHubName: EVENT_HUB_NAME,
})
export class TruckTelemetryHandler {
  private readonly logger;
  constructor(@inject(LOGGER_FACTORY) loggerFactory: LoggerFactory) {
    this.logger = loggerFactory();
  }

  @OnEventHubTrigger({ cardinality: 'many' })
  async handleTruckTelemetry(
    @Messages({
      withPayload: TruckTelemetryPayloadSchema,
      withEventData: true,
    })
    messages: EventHubMessageWrapper<TruckTelemetryPayload, undefined, undefined, true>[],
  ): Promise<void> {
    this.logger.info(`Received ${messages.length} messages from Event Hub`, {
      messages: messages.map(msg => ({
        body: msg.payload,
        enqueuedTimeUtc: msg.eventData.enqueuedTimeUtc,
      })),
    });
  }
}
