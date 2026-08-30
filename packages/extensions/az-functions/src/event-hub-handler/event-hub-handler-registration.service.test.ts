import { app } from '@azure/functions';
import { BindToFluentSyntax, Container } from 'inversify';
import { CalledWithMock, mock, mockFn, MockProxy } from 'jest-mock-extended';
import { getPartialFixture } from 'test-utilities';
import { EventHubHandlerRegistrationService } from './event-hub-handler-registration.service';
import { EventHubHandlerFactory, EventHubTriggerHandler } from './event-hub-handler.factory';
import {
  EventhubTriggerRegistration,
  EventHubTriggersRegistrationService,
} from './event-hub-triggers-registration.service';

jest.mock('@azure/functions');

describe('EventHubHandlerRegistrationService', () => {
  const mockedAppEventHub = jest.mocked(app.eventHub);

  let mockPlatformContainer: MockProxy<Container>;
  let mockFluentSyntax: MockProxy<BindToFluentSyntax<any>>;
  let mockHandlerFactory: MockProxy<EventHubHandlerFactory>;
  let mockTriggersRegistrationService: MockProxy<EventHubTriggersRegistrationService>;
  let subject: EventHubHandlerRegistrationService;

  beforeEach(() => {
    mockPlatformContainer = mock<Container>();
    mockFluentSyntax = mock<BindToFluentSyntax<any>>();
    mockPlatformContainer.bind.mockReturnValue(mockFluentSyntax);
    mockHandlerFactory = mock<EventHubHandlerFactory>();
    mockTriggersRegistrationService = mock<EventHubTriggersRegistrationService>();
    subject = new EventHubHandlerRegistrationService(
      mockPlatformContainer,
      mockHandlerFactory,
      mockTriggersRegistrationService,
    );
  });

  describe('register', () => {
    const mockTestMethod = mockFn<(rg1: string, rg2: string) => void>();
    class TestEventHubHandler {
      async handleEventHubTrigger(arg1: string, arg2: string): Promise<void> {
        mockTestMethod(arg1, arg2);
      }
    }

    const testRegistration = getPartialFixture<EventhubTriggerRegistration>({
      triggerId: 'test-trigger',
      handlerMetadata: {
        connection: 'test-connection',
        eventHubName: 'test-event-hub',
      },
      triggerMetadata: {
        cardinality: 'many',
        extraInputs: [],
        extraOutputs: [],
      },
      triggerMethod: 'handleEventHubTrigger',
    });

    let mockHandler: CalledWithMock<EventHubTriggerHandler>;
    let handlerInstance: TestEventHubHandler;

    beforeEach(() => {
      mockHandler = mockFn<EventHubTriggerHandler>();
      mockPlatformContainer.get.calledWith(TestEventHubHandler).mockReturnValue(new TestEventHubHandler());
      mockHandlerFactory.createHandler.mockReturnValue(mockHandler);

      handlerInstance = new TestEventHubHandler();
      mockPlatformContainer.get.calledWith(TestEventHubHandler).mockReturnValue(handlerInstance);

      mockTriggersRegistrationService.registerTriggers.mockImplementation((_, registerFn) => {
        registerFn(testRegistration);
      });
    });

    it('should bind the event hub handler class to the platform container and register its triggers', () => {
      subject.register(TestEventHubHandler);

      expect(mockPlatformContainer.bind).toHaveBeenCalledWith(TestEventHubHandler);
      expect(mockFluentSyntax.toSelf).toHaveBeenCalled();
      expect(mockPlatformContainer.get).toHaveBeenCalledWith(TestEventHubHandler);
      expect(mockTriggersRegistrationService.registerTriggers).toHaveBeenCalledWith(
        TestEventHubHandler,
        expect.any(Function),
      );
    });

    it('should register the event hub triggers with the correct handler factory', async () => {
      subject.register(TestEventHubHandler);

      const handlerFactoryFunction = mockTriggersRegistrationService.registerTriggers.mock.calls[0]![1];
      handlerFactoryFunction(testRegistration);

      expect(mockHandlerFactory.createHandler).toHaveBeenCalledWith(testRegistration, expect.any(Function));
      expect(mockedAppEventHub).toHaveBeenCalledWith('test-trigger', {
        connection: 'test-connection',
        eventHubName: 'test-event-hub',
        cardinality: 'many',
        extraInputs: [],
        extraOutputs: [],
        handler: mockHandler,
      });
    });

    it('should call the correct method on the handler instance when the trigger is invoked', async () => {
      const handlerInstance = new TestEventHubHandler();
      mockPlatformContainer.get.calledWith(TestEventHubHandler).mockReturnValue(handlerInstance);

      subject.register(TestEventHubHandler);

      const handlerFactoryFunction = mockTriggersRegistrationService.registerTriggers.mock.calls[0]![1];
      handlerFactoryFunction(testRegistration);

      const method = mockHandlerFactory.createHandler.mock.calls[0]![1];
      await method('arg1', 'arg2');
      expect(mockTestMethod).toHaveBeenCalledWith('arg1', 'arg2');
    });
  });
});
