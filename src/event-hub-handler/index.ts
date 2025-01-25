import { ContainerModule } from 'inversify';
import { AzureEventHubTriggerService } from './azure-event-hub-trigger.service';
import { EventHubHandlerProvider } from './event-hub-handler.provider';
import { EventHubHandlersMetadataService } from './event-hub-handlers-metadata.service';
import { EventHubHandlersRegistrationService } from './event-hub-handlers-registration.service';

export * from './decorators';
export { EventHubMessageWrapper } from './event-hub-handler.model';

export const eventHubHandlersModule = new ContainerModule((bind) => {
  bind(AzureEventHubTriggerService).toSelf();
  bind(EventHubHandlersMetadataService).toSelf();
  bind(EventHubHandlerProvider).toSelf();
  bind(EventHubHandlersRegistrationService).toSelf();
});
