import { InvocationContext } from '@azure/functions';
import { Container } from 'inversify';
import { mock, MockProxy } from 'jest-mock-extended';
import { PlatformContextLocalStorage } from 'shared';
import { PartialDeep } from 'type-fest';
import { AzureEventHubTriggerService } from './azure-event-hub-trigger.service';
import { EventHubTriggerRegistrationData } from './event-hub-handler-registration.service';
import { EventHubHandlerProvider } from './event-hub-handler.provider';

describe('EventHubHandlerProvider', () => {
  const storage = new PlatformContextLocalStorage();
  let mockPlatformContainer: MockProxy<Container>;
  let mockEventHubTriggerService: MockProxy<AzureEventHubTriggerService>;
  let mockArgsProvider: jest.Mock;
  let subject: EventHubHandlerProvider;

  beforeEach(() => {
    mockPlatformContainer = mock();
    mockPlatformContainer.getAsync.calledWith(PlatformContextLocalStorage).mockResolvedValue(storage);

    mockEventHubTriggerService = mock();
    mockArgsProvider = jest.fn();
    mockArgsProvider.mockResolvedValue([]);
    mockEventHubTriggerService.buildArgProviders.mockReturnValue(mockArgsProvider);
    mockEventHubTriggerService.handleEventHubEvent.mockImplementation(async (_1, method) => {
      await method();
    });

    subject = new EventHubHandlerProvider(mockPlatformContainer, mockEventHubTriggerService);
  });

  describe('getEventHubTriggerHandler', () => {
    const testRegistrationData = {
      handleMethodMetadata: {
        args: [],
      },
    } as PartialDeep<EventHubTriggerRegistrationData> as EventHubTriggerRegistrationData;

    const mockMessage = {};
    const mockContext = {} as InvocationContext;

    it('should handle trigger', async () => {
      let handled = false;

      const handler = subject.getEventHubTriggerHandler(testRegistrationData, async () => {
        handled = true;
      });

      await handler(mockMessage, mockContext);

      expect(handled).toBeTruthy();
    });
  });
});
