import { InvocationContext } from '@azure/functions';
import { mock, MockProxy } from 'jest-mock-extended';
import { z } from 'zod';
import {
  AzureEventHubTriggerService,
  TriggerMetadataMany,
  TriggerMetadataOne,
} from './azure-event-hub-trigger.service';
import { EventHubTriggerDefinitionError, HandlerArgsParseError } from './event-hub-handler.model';

describe('AzureEventHubTriggerService', () => {
  let mockContext: MockProxy<InvocationContext>;
  let subject: AzureEventHubTriggerService;

  beforeEach(() => {
    mockContext = mock();
    subject = new AzureEventHubTriggerService();
  });

  describe('handleEventHubEvent', () => {
    it('should handle request', async () => {
      const method = jest.fn();

      await subject.handleEventHubEvent(mockContext, method);

      expect(method).toHaveBeenCalled();
    });

    it('should log error if method call fails with error', async () => {
      const method = jest.fn();
      method.mockRejectedValue(new Error('Call failed.'));

      await subject.handleEventHubEvent(mockContext, method);

      expect(method).toHaveBeenCalled();
      expect(mockContext.error).toHaveBeenCalledWith(
        expect.toStartWith(`Internal error:
Error: Call failed.`)
      );
    });

    it('should log error if method call fails with unknown', async () => {
      const method = jest.fn();
      method.mockRejectedValue('Call failed.');

      await subject.handleEventHubEvent(mockContext, method);

      expect(method).toHaveBeenCalled();
      expect(mockContext.error).toHaveBeenCalledWith(expect.toStartWith(`Internal error: Call failed.`));
    });
  });

  describe('buildArgProviders', () => {
    it('should return parsed args in case of no parsing errors', async () => {
      mockContext.triggerMetadata = {
        partitionContext: {
          consumerGroupName: 'consumer-group',
          eventHubPath: 'event-hub-path',
        },
        enqueuedTimeUtcArray: ['2024-11-06T13:48:11.069Z', '2024-11-06T13:48:13.069Z'],
        offsetArray: ['3747f1b2-98af-40b6-8350-c10ebbd40e04', '13ea2df2-1814-4862-a586-fb69d09a48bd'],
        sequenceNumberArray: [1, 2],
        partitionKeyArray: ['partition-key', 'partition-key'],
        propertiesArray: [
          {
            textProperty: 'text-property',
            objProperty: {
              text: 'text',
              number: 1234,
            },
          },
          {
            textProperty: 'text-property',
            objProperty: {
              text: 'text',
              number: 1234,
            },
          },
        ],
        systemPropertiesArray: [
          {
            textProperty: 'text-property',
          },
          {
            textProperty: 'text-property',
          },
        ],
      } as TriggerMetadataMany;

      const argsProvider = subject.buildArgProviders({
        cardinality: 'many',
        args: [
          {
            type: 'context',
          },
          {
            type: 'messages',
            isEventData: true,
            payloadSchema: z.object({ text: z.string(), number: z.number().optional() }),
          },
        ],
      });
      const testMessages = [
        {
          text: 'text1',
          number: 123,
        },
        {
          text: 'text2',
        },
      ];

      const args = await argsProvider(testMessages, mockContext);

      expect(args).toHaveLength(2);
      expect(args[0]).toBe(mockContext);
      expect(args[1]).toEqual([
        {
          eventData: {
            enqueuedTimeUtc: '2024-11-06T13:48:11.069Z',
            offset: '3747f1b2-98af-40b6-8350-c10ebbd40e04',
            partitionContext: {
              consumerGroupName: 'consumer-group',
              eventHubPath: 'event-hub-path',
            },
            partitionKey: 'partition-key',
            sequenceNumber: 1,
          },
          payload: {
            number: 123,
            text: 'text1',
          },
        },
        {
          eventData: {
            enqueuedTimeUtc: '2024-11-06T13:48:13.069Z',
            offset: '13ea2df2-1814-4862-a586-fb69d09a48bd',
            partitionContext: {
              consumerGroupName: 'consumer-group',
              eventHubPath: 'event-hub-path',
            },
            partitionKey: 'partition-key',
            sequenceNumber: 2,
          },
          payload: {
            text: 'text2',
          },
        },
      ]);
    });

    it('should fail in case of multiple parsing errors ', async () => {
      mockContext.triggerMetadata = {
        partitionContext: {
          consumerGroupName: 'consumer-group',
          eventHubPath: 'event-hub-path',
        },
        enqueuedTimeUtc: '2024-11-06T13:48:11.069Z',
        offset: '3747f1b2-98af-40b6-8350-c10ebbd40e04',
        sequenceNumber: 1,
        partitionKey: 'partition-key',
        properties: {
          textProperty: 'text-property',
          objProperty: {
            text: 'text',
            number: 1234,
          },
        },
        systemProperties: {
          textProperty: 'text-property',
        },
      } as TriggerMetadataOne;
      const argsProvider = subject.buildArgProviders({
        args: [
          {
            type: 'context',
          },
          {
            type: 'message',
            payloadSchema: z.object({ text: z.string(), number: z.number().optional() }),
          },
        ],
      });
      const testMessage = [
        {
          text: 'text1',
          number: 123,
        },
        {
          text: 'text2',
        },
      ];

      await expect(argsProvider(testMessage, mockContext)).rejects.toThrowWithMessage(
        HandlerArgsParseError,
        /Error parsing extended message:/
      );
    });

    it('should fail, if multiple cardinality combined with singular message', () => {
      expect(() =>
        subject.buildArgProviders({
          cardinality: 'many',
          args: [
            {
              type: 'context',
            },
            {
              type: 'message',
              payloadSchema: z.object({ text: z.string(), number: z.number().optional() }),
            },
          ],
        })
      ).toThrowWithMessage(
        EventHubTriggerDefinitionError,
        'Decorator "Message" is not allowed with cardinality "many".'
      );
    });

    it('should fail, if single cardinality combined with multiple messages', () => {
      expect(() =>
        subject.buildArgProviders({
          cardinality: 'one',
          args: [
            {
              type: 'context',
            },
            {
              type: 'messages',
              payloadSchema: z.object({ text: z.string(), number: z.number().optional() }),
            },
          ],
        })
      ).toThrowWithMessage(
        EventHubTriggerDefinitionError,
        'Decorator "Messages" is only allowed with cardinality "many".'
      );
    });

    describe('undefined', () => {
      it('should provide undefined', async () => {
        const argsProvider = subject.buildArgProviders({
          args: [
            {
              type: 'undefined',
            },
          ],
        });
        const args = await argsProvider({}, mockContext);

        expect(args[0]).toBeUndefined();
      });
    });

    describe('message', () => {
      beforeEach(() => {
        mockContext.triggerMetadata = {
          partitionContext: {
            consumerGroupName: 'consumer-group',
            eventHubPath: 'event-hub-path',
          },
          enqueuedTimeUtc: '2024-11-06T13:48:11.069Z',
          offset: '3747f1b2-98af-40b6-8350-c10ebbd40e04',
          sequenceNumber: 1,
          partitionKey: 'partition-key',
          properties: {
            textProperty: 'text-property',
            objProperty: {
              text: 'text',
              number: 1234,
            },
          },
          systemProperties: {
            textProperty: 'text-property',
          },
        } as TriggerMetadataOne;
      });

      it('should provide message', async () => {
        const argsProvider = subject.buildArgProviders({
          args: [
            {
              type: 'message',
              payloadSchema: z.object({ text: z.string(), number: z.number().optional() }).array(),
            },
          ],
        });
        const testMessage = [
          {
            text: 'text1',
            number: 123,
          },
          {
            text: 'text2',
          },
        ];

        const args = await argsProvider(testMessage, mockContext);

        expect(args[0]).toEqual({ payload: testMessage });
      });

      it('should fail, if metadata cannot be parsed', async () => {
        delete mockContext.triggerMetadata?.partitionContext;
        const argsProvider = subject.buildArgProviders({
          args: [
            {
              type: 'message',
              payloadSchema: z.object({ text: z.string(), number: z.number().optional() }).array(),
            },
          ],
        });
        const testMessage = [
          {
            text: 'text1',
            number: 123,
          },
          {
            text: 'text2',
          },
        ];

        await expect(argsProvider(testMessage, mockContext)).rejects.toThrowWithMessage(
          HandlerArgsParseError,
          /Error parsing trigger metadata:/
        );
      });

      it('should fail, if message cannot be parsed', async () => {
        const argsProvider = subject.buildArgProviders({
          args: [
            {
              type: 'message',
              payloadSchema: z.object({ text: z.string(), number: z.number().optional() }).array(),
            },
          ],
        });
        const testMessage = [
          {
            text: 'text1',
            number: 123,
          },
          {
            failure: 'text2',
          },
        ];

        await expect(argsProvider(testMessage, mockContext)).rejects.toThrowWithMessage(
          HandlerArgsParseError,
          /Error parsing extended message:/
        );
      });
    });

    describe('messages', () => {
      beforeEach(() => {
        mockContext.triggerMetadata = {
          partitionContext: {
            consumerGroupName: 'consumer-group',
            eventHubPath: 'event-hub-path',
          },
          enqueuedTimeUtcArray: ['2024-11-06T13:48:11.069Z', '2024-11-06T13:48:13.069Z'],
          offsetArray: ['3747f1b2-98af-40b6-8350-c10ebbd40e04', '13ea2df2-1814-4862-a586-fb69d09a48bd'],
          sequenceNumberArray: [1, 2],
          partitionKeyArray: ['partition-key', 'partition-key'],
          propertiesArray: [
            {
              textProperty: 'text-property',
              objProperty: {
                text: 'text',
                number: 1234,
              },
            },
            {
              textProperty: 'text-property',
              objProperty: {
                text: 'text',
                number: 1234,
              },
            },
          ],
          systemPropertiesArray: [
            {
              textProperty: 'text-property',
            },
            {
              textProperty: 'text-property',
            },
          ],
        } as TriggerMetadataMany;
      });

      it('should provide request', async () => {
        const argsProvider = subject.buildArgProviders({
          cardinality: 'many',
          args: [
            {
              type: 'messages',
              isEventData: true,
              propertiesSchema: z.object({
                textProperty: z.string(),
                objProperty: z.object({
                  text: z.string(),
                  number: z.number(),
                }),
              }),
              systemPropertiesSchema: z.object({
                textProperty: z.string(),
              }),
              payloadSchema: z.object({ text: z.string(), number: z.number().optional() }),
            },
          ],
        });
        const testMessage = [
          {
            text: 'text1',
            number: 123,
          },
          {
            text: 'text2',
          },
        ];

        const args = await argsProvider(testMessage, mockContext);

        expect(args[0]).toEqual([
          {
            eventData: {
              enqueuedTimeUtc: '2024-11-06T13:48:11.069Z',
              offset: '3747f1b2-98af-40b6-8350-c10ebbd40e04',
              partitionContext: {
                consumerGroupName: 'consumer-group',
                eventHubPath: 'event-hub-path',
              },
              partitionKey: 'partition-key',
              sequenceNumber: 1,
            },
            payload: {
              number: 123,
              text: 'text1',
            },
            properties: {
              objProperty: {
                number: 1234,
                text: 'text',
              },
              textProperty: 'text-property',
            },
            systemProperties: {
              textProperty: 'text-property',
            },
          },
          {
            eventData: {
              enqueuedTimeUtc: '2024-11-06T13:48:13.069Z',
              offset: '13ea2df2-1814-4862-a586-fb69d09a48bd',
              partitionContext: {
                consumerGroupName: 'consumer-group',
                eventHubPath: 'event-hub-path',
              },
              partitionKey: 'partition-key',
              sequenceNumber: 2,
            },
            payload: {
              text: 'text2',
            },
            properties: {
              objProperty: {
                number: 1234,
                text: 'text',
              },
              textProperty: 'text-property',
            },
            systemProperties: {
              textProperty: 'text-property',
            },
          },
        ]);
      });

      it('should fail, if message is not an array', async () => {
        const argsProvider = subject.buildArgProviders({
          cardinality: 'many',
          args: [
            {
              type: 'messages',
              payloadSchema: z.object({ text: z.string(), number: z.number().optional() }),
            },
          ],
        });
        const testMessage = {
          text: 'text1',
          number: 123,
        };

        await expect(argsProvider(testMessage, mockContext)).rejects.toThrowWithMessage(
          HandlerArgsParseError,
          /Message should be an array for cardinality=many/
        );
      });

      it('should fail, if metadata cannot be parsed', async () => {
        delete mockContext.triggerMetadata?.partitionKeyArray;
        const argsProvider = subject.buildArgProviders({
          cardinality: 'many',
          args: [
            {
              type: 'messages',
              payloadSchema: z.object({ text: z.string(), number: z.number().optional() }),
            },
          ],
        });
        const testMessage = [
          {
            text: 'text1',
            number: 123,
          },
          {
            text: 'text2',
          },
        ];

        await expect(argsProvider(testMessage, mockContext)).rejects.toThrowWithMessage(
          HandlerArgsParseError,
          /Error parsing trigger metadata:/
        );
      });

      it('should fail, if message cannot be parsed', async () => {
        const argsProvider = subject.buildArgProviders({
          cardinality: 'many',
          args: [
            {
              type: 'messages',
              payloadSchema: z.object({ text: z.string(), number: z.number().optional() }),
            },
          ],
        });
        const testMessage = [
          {
            text: 'text1',
            number: 123,
          },
          {
            failure: 'text2',
          },
        ];

        await expect(argsProvider(testMessage, mockContext)).rejects.toThrowWithMessage(
          HandlerArgsParseError,
          /Error parsing extended message:/
        );
      });
    });

    describe('context', () => {
      it('should provide context', async () => {
        const argsProvider = subject.buildArgProviders({
          args: [
            {
              type: 'context',
            },
          ],
        });
        const args = await argsProvider({}, mockContext);

        expect(args[0]).toBe(mockContext);
      });
    });
  });
});
