import { ContainerModule } from 'inversify';
import { TRIGGER_HANDLER_REGISTRATION_SERVICE } from 'shared';
import { EVENT_HUB_HANDLER_TYPE } from './decorators';
import { EventHubHandlerMetadataReader } from './event-hub-handler-metadata.reader';
import { EventHubHandlerRegistrationService } from './event-hub-handler-registration.service';
import { EventHubHandlerFactory } from './event-hub-handler.factory';
import { EventHubTriggerSupportFactory } from './event-hub-trigger-support.factory';
import { EventHubTriggersRegistrationService } from './event-hub-triggers-registration.service';

export * from './decorators';
export { EventHubMessageWrapper } from './event-hub-handler.model';

export const EventHubHandlersModule = new ContainerModule(({ bind }) => {
  bind(EventHubTriggerSupportFactory).toSelf();
  bind(EventHubHandlerMetadataReader).toSelf();
  bind(EventHubHandlerFactory).toSelf();
  bind(TRIGGER_HANDLER_REGISTRATION_SERVICE).to(EventHubHandlerRegistrationService).whenNamed(EVENT_HUB_HANDLER_TYPE);
  bind(EventHubTriggersRegistrationService).toSelf();
});
