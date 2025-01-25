import { z } from 'zod';
import { EventHubHandlers, Handler, Message } from './decorators';
import { EventHubHandlersMetadataService } from './event-hub-handlers-metadata.service';

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

describe('EventHubHandlersMetadataService', () => {
  let subject: EventHubHandlersMetadataService;

  beforeEach(() => {
    subject = new EventHubHandlersMetadataService();
  });

  describe('getOperationMetadata', () => {
    it('should retrieve operation metadata', () => {
      const operationMetadata = subject.getOperationMetadata(new TestEventHubHandlers(), 'testEventHubOperation');

      expect(operationMetadata).toMatchObject({
        consumerGroup: 'test-consumer',
        args: [{ isEventData: true, type: 'message' }],
      });
    });
  });
});
