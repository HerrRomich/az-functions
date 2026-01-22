import { EventHubProducerClient } from '@azure/event-hubs';
import { DefaultAzureCredential } from '@azure/identity';
import { ContainerModule } from 'inversify';
import { APP_CONFIG } from '../app-config/index';
import { EVENT_HUB_CLIENT, EVENT_HUB_NAME } from './event-hub-model';
import { EventHubService } from './event-hub.service';

export { EVENT_HUB_NAME } from './event-hub-model';
export { EventHubService } from './event-hub.service';

export const EventHubModule = new ContainerModule(options => {
  options.bind(EVENT_HUB_CLIENT).toDynamicValue(context => {
    const eventHubNamespace = context.get(APP_CONFIG).eventHubNamespace;
    const credential = new DefaultAzureCredential();

    return new EventHubProducerClient(eventHubNamespace, EVENT_HUB_NAME, credential);
  });
  options.bind(EventHubService).toSelf();
});
