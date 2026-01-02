import { AZURE_FUNCTION_METADATA_KEY } from 'shared';
import { z } from 'zod';
import { EventHubHandler } from '../event-hub-handler.model';
import {
  EVENT_HUB_HANDLE_METHOD_METADATA_KEY,
  eventHubHandler,
  message,
  messages,
  rawMessage,
  rawMessages,
} from './decorators';

@eventHubHandler({
  triggerId: 'test-event-hub-handler1',
  connection: 'test-connection',
  eventHubName: 'test-event-hub-name',
  consumerGroup: 'test-consumer',
})
class TestEventHubHandler1 implements EventHubHandler {
  async handle(
    @message({
      withPayload: z.object({ text: z.string() }),
      withEventData: true,
      withProperties: z.object({ number: z.number() }),
    })
    _message: unknown,
    @rawMessage() _rawMessage: unknown,
  ): Promise<void> {
    // test implementation
  }
}

@eventHubHandler({
  triggerId: 'test-event-hub-handler2',
  connection: 'test-connection',
  eventHubName: 'test-event-hub-name',
  consumerGroup: 'test-consumer',
  cardinality: 'many',
})
class TestEventHubHandler2 implements EventHubHandler {
  async handle(
    @messages({
      withPayload: z.object({ text: z.string() }),
      withEventData: true,
      withProperties: z.object({ number: z.number() }),
    })
    _messages: unknown,
    @rawMessages() _rawMessages: unknown,
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
      expect(metadataKeys).toEqual(['azure_function', '@inversifyjs/core/classIsInjectableFlagReflectKey']);
      expect(Reflect.getMetadata(AZURE_FUNCTION_METADATA_KEY, TestEventHubHandler1)).toEqual({
        type: 'event-hub-handler',
        triggerId: 'test-event-hub-handler1',
        connection: 'test-connection',
        eventHubName: 'test-event-hub-name',
        consumerGroup: 'test-consumer',
      });
    });

    describe('handler decorator', () => {
      it('should provide handler with metadata', () => {
        expect(Reflect.getMetadata(EVENT_HUB_HANDLE_METHOD_METADATA_KEY, testHandler, 'handle')).toEqual({
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
      expect(metadataKeys).toEqual(['azure_function', '@inversifyjs/core/classIsInjectableFlagReflectKey']);
      expect(Reflect.getMetadata(AZURE_FUNCTION_METADATA_KEY, TestEventHubHandler2)).toEqual({
        type: 'event-hub-handler',
        triggerId: 'test-event-hub-handler2',
        connection: 'test-connection',
        eventHubName: 'test-event-hub-name',
        consumerGroup: 'test-consumer',
        cardinality: 'many',
      });
    });

    describe('handler decorator', () => {
      it('should provide handler with metadata', () => {
        expect(Reflect.getMetadata(EVENT_HUB_HANDLE_METHOD_METADATA_KEY, testHandler, 'handle')).toEqual({
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
