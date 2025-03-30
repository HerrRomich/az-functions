import { Container } from 'inversify';
import { eventHubHandlersModule } from './index';
import { AzureEventHubTriggerService } from './azure-event-hub-trigger.service';
import { EventHubHandleMethodArgsMetadataService } from './event-hub-handle-method-args-metadata.service';
import { EventHubHandlerProvider } from './event-hub-handler.provider';
import { EventHubHandlerRegistrationService } from './event-hub-handler-registration.service';

describe('event-hub-handler', () => {
  let iocContainer: Container;

  beforeEach(() => {
    iocContainer = new Container({
      defaultScope: 'Singleton',
    });
  });

  it('should register services', async () => {
    await iocContainer.load(eventHubHandlersModule);

    expect(iocContainer.isBound(AzureEventHubTriggerService)).toBeTruthy();
    expect(iocContainer.isBound(EventHubHandleMethodArgsMetadataService)).toBeTruthy();
    expect(iocContainer.isBound(EventHubHandlerProvider)).toBeTruthy();
    expect(iocContainer.isBound(EventHubHandlerRegistrationService)).toBeTruthy();
  });
});
