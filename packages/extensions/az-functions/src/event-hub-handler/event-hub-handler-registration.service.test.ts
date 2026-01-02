import { app, EventHubFunctionOptions } from '@azure/functions';
import { mock, MockProxy } from 'jest-mock-extended';
import { z } from 'zod';
import { eventHubHandler, message } from './decorators';
import { EventHubHandleMethodArgsMetadataService } from './event-hub-handle-method-args-metadata.service';
import { EventHubHandlerRegistrationService } from './event-hub-handler-registration.service';
import { EventHubHandler, EventHubTriggerDefinitionError } from './event-hub-handler.model';
import { EventHubHandlerProvider } from './event-hub-handler.provider';

jest.mock('@azure/functions');

const handlerBody = jest.fn();
const testHandlerMetadata = {
  triggerId: 'test-handler',
  connection: 'test-connection',
  eventHubName: 'test-event-hub',
};
@eventHubHandler(testHandlerMetadata)
class TestEventHubHandler implements EventHubHandler {
  async handle(
    @message({
      withPayload: z.object({ text: z.string() }),
      withEventData: true,
      withProperties: z.object({ number: z.number() }),
    })
    _messages: unknown,
  ): Promise<void> {
    handlerBody();
  }
}

@eventHubHandler(testHandlerMetadata)
class TestEventHubHandlerWithoutArgs implements EventHubHandler {
  async handle(): Promise<void> {
    handlerBody();
  }
}

const testFailureHandlerMetadata = {
  triggerId: 'test-failure-handler',
  connection: 'test-connection',
  eventHubName: 'test-event-hub-name',
  consumerGroup: 'test-consumer',
};

@eventHubHandler(testFailureHandlerMetadata)
class TestFailureEventHubHandler {}

describe('EventHubHandlerRegistrationService', () => {
  let mockHandleMethodArgsMetadataService: MockProxy<EventHubHandleMethodArgsMetadataService>;
  let mockHandlerProvider: MockProxy<EventHubHandlerProvider>;
  let subject: EventHubHandlerRegistrationService;

  let testEventHubHandler: TestEventHubHandler;

  beforeEach(() => {
    testEventHubHandler = new TestEventHubHandler();

    mockHandleMethodArgsMetadataService = mock();
    mockHandleMethodArgsMetadataService.getMethodArgsMetadata.calledWith(testEventHubHandler).mockReturnValue({
      args: [],
    });

    mockHandlerProvider = mock();
  });

  describe('startPlatform displayMode, other than start', () => {
    it('should not register azure function event hub trigger', () => {
      subject = new EventHubHandlerRegistrationService(
        'print-open-api',
        mockHandleMethodArgsMetadataService,
        mockHandlerProvider,
      );

      subject.register(testEventHubHandler, { ...testHandlerMetadata, type: 'event-hub-handler' });

      expect(app.eventHub).not.toHaveBeenCalled();
    });
  });

  describe('register', () => {
    beforeEach(() => {
      mockHandlerProvider.getEventHubTriggerHandler.mockImplementation((_, method) => async () => {
        await method();
      });
      subject = new EventHubHandlerRegistrationService(
        'start',
        mockHandleMethodArgsMetadataService,
        mockHandlerProvider,
      );
    });

    afterEach(() => {
      jest.resetAllMocks();
    });

    it('should register event hub trigger handler', () => {
      subject.register(testEventHubHandler, { ...testHandlerMetadata, type: 'event-hub-handler' });

      expect(app.eventHub).toHaveBeenCalled();
      const mocked = jest.mocked(app.eventHub);
      const handler = (mocked.mock.calls[0]![1] as EventHubFunctionOptions).handler;
      handler(mock(), mock());
      handler(mock(), mock());
      expect(handlerBody).toHaveBeenCalledTimes(2);
    });

    it('should register event hub trigger handler without args metadata', () => {
      const testEventHubHandlerWithoutArgs = new TestEventHubHandlerWithoutArgs();
      mockHandleMethodArgsMetadataService.getMethodArgsMetadata
        .calledWith(testEventHubHandlerWithoutArgs)
        .mockReturnValue(undefined);

      subject.register(testEventHubHandlerWithoutArgs, { ...testHandlerMetadata, type: 'event-hub-handler' });

      expect(app.eventHub).toHaveBeenCalled();
    });

    it('should fail, if no handle method is registered', () => {
      expect(() =>
        subject.register(new TestFailureEventHubHandler(), {
          ...testFailureHandlerMetadata,
          type: 'event-hub-handler',
        }),
      ).toThrowWithMessage(
        EventHubTriggerDefinitionError,
        'Event hub handler service "TestFailureEventHubHandler" with triggerId=test-failure-handler has no "handle" method. Please, implement "EventHubHandler" interface.',
      );
    });
  });
});
