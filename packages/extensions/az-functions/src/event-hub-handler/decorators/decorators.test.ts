import { FUNCTION_HANDLER_METADATA } from 'shared';
import { z } from 'zod';
import { EventHubHandler, Message, Messages, OnEventHubTrigger, RawMessage, RawMessages } from './decorators';

@EventHubHandler({
  connection: 'test-connection',
  eventHubName: 'test-event-hub-name',
})
class TestEventHubHandler1 {
  @OnEventHubTrigger({
    triggerId: 'test-event-hub-handler1',
    consumerGroup: 'test-consumer',
  })
  async handle(
    @Message({
      withPayload: z.object({ text: z.string() }),
      withEventData: true,
      withProperties: z.object({ number: z.number() }),
    })
    _message: unknown,
    @RawMessage() _rawMessage: unknown,
  ): Promise<void> {
    // test implementation
  }

  @OnEventHubTrigger({
    triggerId: 'test-event-hub-handler1-wrong',
  })
  async TestInvalidMethodName() {
    // private method implementation
  }
}

@EventHubHandler({ connection: 'test-connection', eventHubName: 'test-event-hub-name' })
class TestEventHubHandler2 {
  @OnEventHubTrigger({
    triggerId: 'test-event-hub-handler2',
    consumerGroup: 'test-consumer',
    cardinality: 'many',
  })
  async handle(
    @Messages({
      withPayload: z.object({ text: z.string() }),
      withEventData: true,
      withProperties: z.object({ number: z.number() }),
    })
    _messages: unknown,
    @RawMessages() _rawMessages: unknown,
  ): Promise<void> {
    // test implementation
  }
}

describe('decorators', () => {
  describe('cardinality single', () => {
    let testHandler: TestEventHubHandler1;
    beforeEach(() => {
      testHandler = new TestEventHubHandler1();
    });

    it('should provide handler with metadata', () => {
      const metadataKeys = Reflect.getMetadataKeys(TestEventHubHandler1);
      expect(metadataKeys).toEqual([FUNCTION_HANDLER_METADATA, '@inversifyjs/core/classIsInjectableFlagReflectKey']);
      expect(Reflect.getMetadata(FUNCTION_HANDLER_METADATA, TestEventHubHandler1)).toEqual({
        type: 'event-hub-handler',
        connection: 'test-connection',
        eventHubName: 'test-event-hub-name',
      });
    });

    describe('handler decorator', () => {
      it('should provide handler with metadata', () => {
        expect(Reflect.getMetadata(FUNCTION_HANDLER_METADATA, testHandler, 'handle')).toEqual({
          type: 'event-hub-handler',
          triggerId: 'test-event-hub-handler1',
          consumerGroup: 'test-consumer',
          args: [
            expect.objectContaining({
              type: 'message',
              isEventData: true,
              payloadSchema: expect.anything(),
              propertiesSchema: expect.anything(),
            }),
            expect.objectContaining({
              type: 'rawMessage',
            }),
          ],
        });
      });
    });
  });

  describe('cardinality multiple', () => {
    let testHandler: TestEventHubHandler2;
    beforeEach(() => {
      testHandler = new TestEventHubHandler2();
    });

    it('should provide handler with metadata', () => {
      const metadataKeys = Reflect.getMetadataKeys(TestEventHubHandler2);
      expect(metadataKeys).toEqual([FUNCTION_HANDLER_METADATA, '@inversifyjs/core/classIsInjectableFlagReflectKey']);
      expect(Reflect.getMetadata(FUNCTION_HANDLER_METADATA, TestEventHubHandler2)).toEqual({
        type: 'event-hub-handler',
        connection: 'test-connection',
        eventHubName: 'test-event-hub-name',
      });
    });

    describe('handler decorator', () => {
      it('should provide handler with metadata', () => {
        expect(Reflect.getMetadata(FUNCTION_HANDLER_METADATA, testHandler, 'handle')).toEqual({
          type: 'event-hub-handler',
          triggerId: 'test-event-hub-handler2',
          cardinality: 'many',
          consumerGroup: 'test-consumer',
          args: [
            expect.objectContaining({
              type: 'messages',
              isEventData: true,
              payloadSchema: expect.anything(),
              propertiesSchema: expect.anything(),
            }),
            expect.objectContaining({
              type: 'rawMessages',
            }),
          ],
        });
      });
    });
  });
});
