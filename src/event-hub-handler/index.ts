import { ContainerModule } from 'inversify';
import { AzureEventHubTriggerService } from './azure-event-hub-trigger.service';
import { EventHubHandleMethodArgsMetadataService } from './event-hub-handle-method-args-metadata.service';
import { EventHubHandlerRegistrationService } from './event-hub-handler-registration.service';
import { EventHubHandlerProvider } from './event-hub-handler.provider';

export * from './decorators';
export { EventHubHandler, EventHubMessageWrapper } from './event-hub-handler.model';

export const eventHubHandlersModule = new ContainerModule(({ bind }) => {
  bind(AzureEventHubTriggerService).toSelf();
  bind(EventHubHandleMethodArgsMetadataService).toSelf();
  bind(EventHubHandlerProvider).toSelf();
  bind(EventHubHandlerRegistrationService).toSelf();
});
