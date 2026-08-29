import { InvocationContext } from '@azure/functions';
import { getPartialFixture } from '@utilities/test-utilities';
import { PLATFORM_CONTEXT_MANAGER, PLATFORM_CONTEXT_PROVIDER, PlatformContextManager } from 'context';
import { Container } from 'inversify';
import { CalledWithMock, mock, mockFn, MockProxy } from 'jest-mock-extended';
import { Logger } from 'logger';
import { EventHubHandlerFactory } from './event-hub-handler.factory';
import { EventHubTriggerSupportFactory } from './event-hub-trigger-support.factory';
import { EventhubTriggerRegistration } from './event-hub-triggers-registration.service';

describe('EventHubHandlerFactory', () => {
  const testRegistrationData = getPartialFixture<EventhubTriggerRegistration>({
    triggerMetadata: {
      args: [
        {
          type: 'invocationContext',
        },
        {
          type: 'messages',
        },
      ],
      cardinality: 'many',
    },
  });

  let mockLogger: MockProxy<Logger>;
  let mockPlatformContainer: MockProxy<Container>;
  let mockContextManager: MockProxy<PlatformContextManager>;
  let mockContextProvider: MockProxy<PlatformContextManager>;
  let mockEventHubTriggerService: MockProxy<EventHubTriggerSupportFactory>;
  let subject: EventHubHandlerFactory;

  const mockContext = mock<InvocationContext>();
  let mockMethod: CalledWithMock<(...args: unknown[]) => Promise<void>>;

  beforeEach(() => {
    mockLogger = mock<Logger>();
    mockContextManager = mock<PlatformContextManager>();
    mockContextManager.runWith.mockImplementation((context, fn) => fn());

    mockContextProvider = mock<PlatformContextManager>();

    mockPlatformContainer = mock<Container>();
    mockPlatformContainer.get.calledWith(PLATFORM_CONTEXT_MANAGER).mockReturnValue(mockContextManager);
    mockPlatformContainer.get.calledWith(PLATFORM_CONTEXT_PROVIDER).mockReturnValue(mockContextProvider);

    mockEventHubTriggerService = mock<EventHubTriggerSupportFactory>();

    subject = new EventHubHandlerFactory(() => mockLogger, mockPlatformContainer, mockEventHubTriggerService);

    mockMethod = mockFn<(...args: unknown[]) => Promise<void>>().mockResolvedValue(undefined);
  });

  describe('createHandler', () => {
    it('should create a handler that invokes the provided method with the correct arguments', async () => {
      const mockMessages = ['message1', 'message2'];

      const mockArgsProvider = jest.fn().mockResolvedValue(['arg1Value', 'arg2Value']);
      mockEventHubTriggerService.buildArgProviders.mockReturnValue(mockArgsProvider);

      const handler = subject.createHandler(testRegistrationData, mockMethod);
      await handler(mockMessages, mockContext);

      expect(mockEventHubTriggerService.buildArgProviders).toHaveBeenCalledWith(
        testRegistrationData.triggerMetadata.args,
        testRegistrationData.triggerMetadata.cardinality,
      );
      expect(mockArgsProvider).toHaveBeenCalledWith(mockMessages, mockContext);
      expect(mockMethod).toHaveBeenCalledWith('arg1Value', 'arg2Value');
    });

    it('should log errors if the method throws an error', async () => {
      const mockMessages = ['message1', 'message2'];
      const testError = new Error('Test error');

      const mockArgsProvider = jest.fn().mockResolvedValue(['arg1Value', 'arg2Value']);
      mockEventHubTriggerService.buildArgProviders.mockReturnValue(mockArgsProvider);
      mockMethod.mockRejectedValue(testError);

      const handler = subject.createHandler(testRegistrationData, mockMethod);
      await handler(mockMessages, mockContext);

      expect(mockMethod).toHaveBeenCalledWith('arg1Value', 'arg2Value');
      expect(mockLogger.error).toHaveBeenCalledWith('Error processing Event Hub event', {
        messages: mockMessages,
        triggerMetadata: mockContext.triggerMetadata,
        error: testError,
      });
    });
  });
});
