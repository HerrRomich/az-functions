import { EventHubProducerClient } from '@azure/event-hubs';
import { inject, injectable } from 'inversify';
import { EVENT_HUB_CLIENT, TruckTelemetry } from './event-hub-model';

@injectable()
export class EventHubService {
  constructor(@inject(EVENT_HUB_CLIENT) private readonly eventHubClient: EventHubProducerClient) {}

  async sendMessage(message: TruckTelemetry): Promise<void> {
    const batch = await this.eventHubClient.createBatch();
    batch.tryAdd({ body: message });
    batch.tryAdd({ body: message });
    batch.tryAdd({ body: message });
    batch.tryAdd({ body: message });
    batch.tryAdd({ body: message });
    batch.tryAdd({ body: message });
    batch.tryAdd({ body: message });
    batch.tryAdd({ body: message });
    batch.tryAdd({ body: message });
    batch.tryAdd({ body: 'message' });
    batch.tryAdd({ body: message });
    batch.tryAdd({ body: message });
    batch.tryAdd({ body: message });
    batch.tryAdd({ body: message });
    await this.eventHubClient.sendBatch(batch);
  }
}
