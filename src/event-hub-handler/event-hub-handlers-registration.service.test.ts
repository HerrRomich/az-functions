import { app } from '@azure/functions';
import { mock, MockProxy } from 'jest-mock-extended';
import { z } from 'zod';
import { EventHubHandlers, EventHubHandlersMetadata, Handler, Message } from './decorators';
import { EventHubHandlerProvider } from './event-hub-handler.provider';
import { EventHubHandlersMetadataService } from './event-hub-handlers-metadata.service';
import { EventHubHandlersRegistrationService } from './event-hub-handlers-registration.service';

jest.mock('@azure/functions');

@EventHubHandlers({
  connection: 'test-connection',
  eventHubName: 'test-event-hub-name',
})
class TestEventHubHandlers {
  @Handler({
    consumerGroup: 'test-consumer',
  })
  async testEventHubOperation(
    @Message({
      withPayload: z.object({ text: z.string() }),
      withEventData: true,
      withProperties: z.object({ number: z.number() }),
    })
    _messages: string[]
  ): Promise<void> {}
}

describe('EventHubHandlersRegistrationService', () => {
  const testHandlersMetadata: EventHubHandlersMetadata = {
    type: 'event-hub-handlers',
    connection: 'test-connection',
    eventHubName: 'test-event-hub',
  };

  let mockHandlersMetadataService: MockProxy<EventHubHandlersMetadataService>;
  let mockHandlerProvider: MockProxy<EventHubHandlerProvider>;
  let subject: EventHubHandlersRegistrationService;

  let testEventHubHandlers: TestEventHubHandlers;

  beforeEach(() => {
    testEventHubHandlers = new TestEventHubHandlers();

    mockHandlersMetadataService = mock();
    mockHandlersMetadataService.getOperationMetadata
      .calledWith(testEventHubHandlers, 'testEventHubOperation')
      .mockReturnValue({
        args: [],
      });

    mockHandlerProvider = mock();
  });

  describe('platform mode, other than start', () => {
    it('should not register azure function event hub trigger', () => {
      subject = new EventHubHandlersRegistrationService(
        'print-open-api',
        mockHandlersMetadataService,
        mockHandlerProvider
      );

      subject.register(testEventHubHandlers, testHandlersMetadata);

      expect(app.eventHub).not.toHaveBeenCalled();
    });
  });

  describe('register', () => {
    beforeEach(() => {
      subject = new EventHubHandlersRegistrationService('start', mockHandlersMetadataService, mockHandlerProvider);
    });

    it('should register event hub trigger handler', () => {
      subject.register(testEventHubHandlers, testHandlersMetadata);

      expect(app.eventHub).toHaveBeenCalled();
    });
  });
});
