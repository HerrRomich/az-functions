import { z } from 'zod';
import { eventHubHandler, message } from './decorators';
import { EventHubHandleMethodArgsMetadataService } from './event-hub-handle-method-args-metadata.service';
import { EventHubHandler } from './event-hub-handler.model';

@eventHubHandler({
  triggerId: 'test-event-hub-handler',
  connection: 'test-connection',
  eventHubName: 'test-event-hub-name',
  consumerGroup: 'test-consumer',
})
class TestEventHubHandler implements EventHubHandler {
  async handle(
    @message({
      withPayload: z.object({ text: z.string() }),
      withEventData: true,
      withProperties: z.object({ number: z.number() }),
    })
    _messages: unknown,
  ): Promise<void> {
    // test implementation
  }
}

describe('EventHubHandlerMethodMetadataService', () => {
  let subject: EventHubHandleMethodArgsMetadataService;

  beforeEach(() => {
    subject = new EventHubHandleMethodArgsMetadataService();
  });

  describe('getOperationMetadata', () => {
    it('should retrieve operation metadata', () => {
      const operationMetadata = subject.getMethodArgsMetadata(new TestEventHubHandler());

      expect(operationMetadata).toMatchObject({
        args: [{ isEventData: true, type: 'message' }],
      });
    });
  });
});
