import { BindInWhenOnFluentSyntax, BindToFluentSyntax, ContainerModuleLoadOptions } from 'inversify';
import { mock, MockProxy } from 'jest-mock-extended';
import { TRIGGER_HANDLER_REGISTRATION_SERVICE } from 'shared';
import { EventHubHandlerMetadataReader } from './event-hub-handler-metadata.reader';
import { EventHubHandlerFactory } from './event-hub-handler.factory';
import { EventHubTriggerSupportFactory } from './event-hub-trigger-support.factory';
import { EventHubTriggersRegistrationService } from './event-hub-triggers-registration.service';
import { EVENT_HUB_HANDLER_TYPE, EventHubHandlersModule } from './index';

describe('event-hub-handler', () => {
  let mockLoadOptions: MockProxy<ContainerModuleLoadOptions>;

  beforeEach(() => {
    mockLoadOptions = mock<ContainerModuleLoadOptions>();

    mockLoadOptions.bind.mockImplementation(() => {
      const mockBinding = mock<BindToFluentSyntax<any>>();
      mockBinding.to.mockImplementation(() => mock<BindInWhenOnFluentSyntax<any>>());
      return mockBinding;
    });
  });

  it('should register 4 services', async () => {
    await EventHubHandlersModule.load(mockLoadOptions);

    expect(mockLoadOptions.bind).toHaveBeenCalledTimes(5);
  });

  it('should register AzureEventHubTriggerService', async () => {
    await EventHubHandlersModule.load(mockLoadOptions);

    expect(mockLoadOptions.bind).toHaveBeenNthCalledWith(1, EventHubTriggerSupportFactory);
    const mockBindSyntax = mockLoadOptions.bind.mock.results[0]!.value as MockProxy<
      BindToFluentSyntax<EventHubTriggerSupportFactory>
    >;
    expect(mockBindSyntax.toSelf).toHaveBeenCalled();
  });

  it('should register EventHubHandlerMetadataReader', async () => {
    await EventHubHandlersModule.load(mockLoadOptions);

    expect(mockLoadOptions.bind).toHaveBeenNthCalledWith(2, EventHubHandlerMetadataReader);
    const mockBindSyntax = mockLoadOptions.bind.mock.results[1]!.value as MockProxy<
      BindToFluentSyntax<EventHubHandlerMetadataReader>
    >;
    expect(mockBindSyntax.toSelf).toHaveBeenCalled();
  });

  it('should register EventHubHandlerFactory', async () => {
    await EventHubHandlersModule.load(mockLoadOptions);

    expect(mockLoadOptions.bind).toHaveBeenNthCalledWith(3, EventHubHandlerFactory);
    const mockBindSyntax = mockLoadOptions.bind.mock.results[2]!.value as MockProxy<
      BindToFluentSyntax<EventHubHandlerFactory>
    >;
    expect(mockBindSyntax.toSelf).toHaveBeenCalled();
  });

  it('should register TRIGGER_HANDLER_REGISTRATION_SERVICE with EventHubHandlerRegistrationService when named EVENT_HUB_HANDLER_TYPE', async () => {
    await EventHubHandlersModule.load(mockLoadOptions);

    expect(mockLoadOptions.bind).toHaveBeenNthCalledWith(4, TRIGGER_HANDLER_REGISTRATION_SERVICE);
    const mockBindSyntax = mockLoadOptions.bind.mock.results[3]!.value as MockProxy<BindToFluentSyntax<any>>;
    expect(mockBindSyntax.to).toHaveBeenCalledWith(expect.any(Function));
    const mockBindWhenSyntax = mockBindSyntax.to.mock.results[0]!.value as MockProxy<BindInWhenOnFluentSyntax<any>>;
    expect(mockBindWhenSyntax.whenNamed).toHaveBeenCalledWith(EVENT_HUB_HANDLER_TYPE);
  });

  it('should register EventHubTriggersRegistrationService', async () => {
    await EventHubHandlersModule.load(mockLoadOptions);

    expect(mockLoadOptions.bind).toHaveBeenNthCalledWith(5, EventHubTriggersRegistrationService);
    const mockBindSyntax = mockLoadOptions.bind.mock.results[4]!.value as MockProxy<
      BindToFluentSyntax<EventHubTriggersRegistrationService>
    >;
    expect(mockBindSyntax.toSelf).toHaveBeenCalled();
  });
});
