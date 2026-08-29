import { EventHubProducerClient } from '@azure/event-hubs';
import { serviceIdentifier } from '@herrromich/az-functions';

export const EVENT_HUB_NAME = 'evh-fleet-sight';
export const EVENT_HUB_CLIENT = serviceIdentifier<EventHubProducerClient>('FleetSight.EventHubClient');

export interface TruckTelemetry {
  speed: number;
}
