import { InvocationContext } from '@azure/functions';
import { mock, MockProxy } from 'jest-mock-extended';
import * as lodash from 'lodash';
import { HandlerArgsParseError } from 'shared';
import { z } from 'zod';
import { EventHubTriggerDefinitionError } from './event-hub-handler.model';
import { EventHubTriggerSupportFactory } from './event-hub-trigger-support.factory';
import { TriggerMetadataMany, TriggerMetadataOne } from './event-hub-trigger.model';

describe('AzureEventHubTriggerSupportService', () => {
  let mockContext: MockProxy<InvocationContext>;
  let subject: EventHubTriggerSupportFactory;

  beforeEach(() => {
    mockContext = mock();
    subject = new EventHubTriggerSupportFactory();
  });

  describe('createRequestArgsProvider', () => {
    const testPartitionContext = {
      fullyQualifiedNamespace: 'namespace',
      consumerGroup: 'consumer-group',
      eventHubName: 'event-hub-path',
      partitionId: 'partition-id',
    };
    const testTriggerMetadataSingle: TriggerMetadataOne = {
      partitionContext: testPartitionContext,
      enqueuedTimeUtc: '2024-11-06T13:48:11.069Z',
      offset: 12,
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
    };

    const testTriggerMetadataMany: TriggerMetadataMany = {
      partitionContext: testPartitionContext,
      enqueuedTimeUtcArray: ['2024-11-06T13:48:11.069Z', '2024-11-06T13:48:13.069Z', '2024-11-06T13:48:15.069Z'],
      offsetArray: [12, 17, 25],
      sequenceNumberArray: [1, 2, 3],
      partitionKeyArray: ['partition-key1', 'partition-key2', 'partition-key3'],
      propertiesArray: [
        {
          textProperty: 'text-property1',
          objProperty: {
            text: 'text',
            number: 1234,
          },
        },
        {
          textProperty: 'text-property2',
          objProperty: {
            text: 'text',
            number: 5678,
          },
        },
        {
          textProperty: 'text-property3',
          objProperty: {
            text: 'text3',
            number: 9012,
          },
        },
      ],
      systemPropertiesArray: [
        {
          textProperty: 'text-property1',
        },
        {
          textProperty: 'text-property2',
        },
        {
          textProperty: 'text-property3',
        },
      ],
    };

    it('should return parsed args in case of no parsing errors', async () => {
      mockContext.triggerMetadata = testTriggerMetadataMany;

      const argsProvider = subject.buildArgProviders(
        [
          {
            type: 'invocationContext',
          },
          {
            type: 'messages',
            isEventData: true,
            payloadSchema: z.object({ text: z.string(), number: z.number().optional() }),
          },
          {
            type: 'rawMessages',
          },
        ],
        'many',
      );
      const testMessages = [
        {
          text: 'text1',
          number: 123,
        },
        {
          text: 'text2',
        },
        {
          wrongProperty: 'wrongValue',
        },
      ];

      const args = await argsProvider(testMessages, mockContext);

      expect(args).toHaveLength(3);
      expect(args[0]).toBe(mockContext);
      expect(args[1]).toEqual([
        {
          valid: true,
          eventData: {
            enqueuedTimeUtc: '2024-11-06T13:48:11.069Z',
            offset: 12,
            partitionContext: {
              fullyQualifiedNamespace: 'namespace',
              consumerGroup: 'consumer-group',
              eventHubName: 'event-hub-path',
              partitionId: 'partition-id',
            },
            partitionKey: 'partition-key1',
            sequenceNumber: 1,
          },
          payload: {
            number: 123,
            text: 'text1',
          },
        },
        {
          valid: true,
          eventData: {
            enqueuedTimeUtc: '2024-11-06T13:48:13.069Z',
            offset: 17,
            partitionContext: {
              fullyQualifiedNamespace: 'namespace',
              consumerGroup: 'consumer-group',
              eventHubName: 'event-hub-path',
              partitionId: 'partition-id',
            },
            partitionKey: 'partition-key2',
            sequenceNumber: 2,
          },
          payload: {
            text: 'text2',
          },
        },
        {
          valid: false,
          error: expect.any(HandlerArgsParseError),
          eventData: {
            enqueuedTimeUtc: '2024-11-06T13:48:15.069Z',
            offset: 25,
            partitionContext: {
              fullyQualifiedNamespace: 'namespace',
              consumerGroup: 'consumer-group',
              eventHubName: 'event-hub-path',
              partitionId: 'partition-id',
            },
            partitionKey: 'partition-key3',
            sequenceNumber: 3,
          },
          payload: {
            wrongProperty: 'wrongValue',
          },
          properties: {
            textProperty: 'text-property3',
            objProperty: {
              text: 'text3',
              number: 9012,
            },
          },
          systemProperties: {
            textProperty: 'text-property3',
          },
        },
      ]);
      expect(args[2]).toBe(testMessages);
    });

    it('should return parsed valid args in case of no payload schema', async () => {
      mockContext.triggerMetadata = testTriggerMetadataSingle;

      const argsProvider = subject.buildArgProviders([
        {
          type: 'invocationContext',
        },
        {
          type: 'message',
        },
      ]);
      const testMessage = {
        text: 'text1',
        number: 123,
      };

      const args = await argsProvider(testMessage, mockContext);

      expect(args).toHaveLength(2);
      expect(args[0]).toBe(mockContext);
      expect(args[1]).toEqual({
        valid: true,
        payload: testMessage,
      });
    });

    it('should fail in case of multiple parsing errors', async () => {
      mockContext.triggerMetadata = {
        partitionContext: {
          fullyQualifiedNamespace: 'namespace',
          eventHubName: 'event-hub-path',
          partitionId: 'partition-id',
        },
        enqueuedTimeUtc: '2024-11-06T13:48:11.069Z',
        offset: 12,
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
      };
      const argsProvider = subject.buildArgProviders([
        {
          type: 'invocationContext',
        },
        {
          type: 'message',
          payloadSchema: z.object({ text: z.string(), number: z.number().optional() }),
        },
      ]);
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
        /Error parsing handler arguments/,
      );
    });

    it('should fail, if multiple cardinality combined with singular Message', () => {
      expect(() =>
        subject.buildArgProviders(
          [
            {
              type: 'invocationContext',
            },
            {
              type: 'message',
              payloadSchema: z.object({ text: z.string(), number: z.number().optional() }),
            },
          ],
          'many',
        ),
      ).toThrowWithMessage(
        EventHubTriggerDefinitionError,
        'Decorator "Message" is not allowed with cardinality "many"',
      );
    });

    it('should fail, if single cardinality combined with multiple Messages', () => {
      expect(() =>
        subject.buildArgProviders(
          [
            {
              type: 'invocationContext',
            },
            {
              type: 'messages',
              payloadSchema: z.object({ text: z.string(), number: z.number().optional() }),
            },
          ],
          'one',
        ),
      ).toThrowWithMessage(
        EventHubTriggerDefinitionError,
        'Decorator "Messages" is only allowed with cardinality "many"',
      );
    });
    it('should fail, if singular cardinality combined with RawMessages', () => {
      expect(() =>
        subject.buildArgProviders(
          [
            {
              type: 'invocationContext',
            },
            {
              type: 'rawMessages',
            },
          ],
          'one',
        ),
      ).toThrowWithMessage(
        EventHubTriggerDefinitionError,
        'Decorator "RawMessages" is only allowed with cardinality "many"',
      );
    });

    it('should fail, if multiple cardinality combined with RawMessage', () => {
      expect(() =>
        subject.buildArgProviders(
          [
            {
              type: 'invocationContext',
            },
            {
              type: 'rawMessage',
            },
          ],
          'many',
        ),
      ).toThrowWithMessage(
        EventHubTriggerDefinitionError,
        'Decorator "RawMessage" is not allowed with cardinality "many"',
      );
    });

    describe('undefined', () => {
      it('should provide undefined', async () => {
        const argsProvider = subject.buildArgProviders([
          {
            type: 'undefined',
          },
        ]);
        const args = await argsProvider({}, mockContext);

        expect(args[0]).toBeUndefined();
      });
    });

    describe('message', () => {
      beforeEach(() => {
        mockContext.triggerMetadata = lodash.cloneDeep(testTriggerMetadataSingle);
      });

      it('should provide valid message', async () => {
        const argsProvider = subject.buildArgProviders([
          {
            type: 'message',
            payloadSchema: z.object({ text: z.string(), number: z.number().optional() }).array(),
          },
        ]);
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

        expect(args[0]).toEqual({
          valid: true,
          payload: testMessage,
        });
      });

      it('should provide invalid message', async () => {
        const argsProvider = subject.buildArgProviders([
          {
            type: 'message',
            payloadSchema: z.object({ text: z.string(), number: z.number().optional() }).array(),
          },
        ]);
        const testMessage = [
          {
            text: 'text1',
            number: 123,
          },
          {
            text: 'text2',
          },
          {
            wrongProperty: 'wrongValue',
          },
        ];

        const args = await argsProvider(testMessage, mockContext);

        expect(args[0]).toEqual({
          valid: false,
          error: expect.any(HandlerArgsParseError),
          payload: [
            {
              number: 123,
              text: 'text1',
            },
            {
              text: 'text2',
            },
            {
              wrongProperty: 'wrongValue',
            },
          ],
          eventData: {
            enqueuedTimeUtc: '2024-11-06T13:48:11.069Z',
            offset: 12,
            partitionContext: {
              consumerGroup: 'consumer-group',
              eventHubName: 'event-hub-path',
              fullyQualifiedNamespace: 'namespace',
              partitionId: 'partition-id',
            },
            partitionKey: 'partition-key',
            sequenceNumber: 1,
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
        });
      });

      it('should fail, if rawMetadata cannot be parsed', async () => {
        delete mockContext.triggerMetadata?.partitionContext;
        const argsProvider = subject.buildArgProviders([
          {
            type: 'message',
            payloadSchema: z.object({ text: z.string(), number: z.number().optional() }).array(),
          },
        ]);
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
          'Error parsing handler arguments',
        );
      });
    });

    describe('messages', () => {
      beforeEach(() => {
        mockContext.triggerMetadata = {
          partitionContext: {
            fullyQualifiedNamespace: 'namespace',
            consumerGroup: 'consumer-group',
            eventHubName: 'event-hub-path',
            partitionId: 'partition-id',
          },
          enqueuedTimeUtcArray: [
            '2024-11-06T13:48:11.069Z',
            '2024-11-06T13:48:13.069Z',
            '2024-11-06T13:48:15.069Z',
            '2024-11-06T13:48:17.069Z',
          ],
          offsetArray: [12, 13, 18, 23],
          sequenceNumberArray: [1, 2, 3, 4],
          partitionKeyArray: ['partition-key1', 'partition-key2', 'partition-key3', 'partition-key4'],
          propertiesArray: [
            {
              textProperty: 'text-property1',
              objProperty: {
                text: 'text1',
                number: 1234,
              },
            },
            {
              textProperty: 'text-property2',
              objProperty: {
                text: 'text2',
                number: 5678,
              },
            },
            {
              textProperty: 'text-property3',
              objProperty: {
                text: 'text3',
                number: 9012,
              },
            },
            {
              textProperty: 'text-property4',
              objProperty: {
                number: 3456,
              },
            },
          ],
          systemPropertiesArray: [
            {
              textProperty: 'text-property1',
            },
            {
              textProperty: 'text-property2',
            },
            {
              textProperty: 'text-property3',
            },
            {
              unknownProperty: 'unknown-value',
            },
          ],
        } as TriggerMetadataMany;
      });

      it('should provide request', async () => {
        const argsProvider = subject.buildArgProviders(
          [
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
          'many',
        );
        const testMessage = [
          {
            text: 'text1',
            number: 123,
          },
          {
            text: 'text2',
          },
          {
            unknownProperty: 'unknownValue',
          },
          {
            text: 'text4',
            number: 456,
          },
        ];

        const args = await argsProvider(testMessage, mockContext);

        expect(args[0]).toEqual([
          {
            valid: true,
            eventData: {
              enqueuedTimeUtc: '2024-11-06T13:48:11.069Z',
              offset: 12,
              partitionContext: {
                fullyQualifiedNamespace: 'namespace',
                consumerGroup: 'consumer-group',
                eventHubName: 'event-hub-path',
                partitionId: 'partition-id',
              },
              partitionKey: 'partition-key1',
              sequenceNumber: 1,
            },
            payload: {
              number: 123,
              text: 'text1',
            },
            properties: {
              objProperty: {
                number: 1234,
                text: 'text1',
              },
              textProperty: 'text-property1',
            },
            systemProperties: {
              textProperty: 'text-property1',
            },
          },
          {
            valid: true,
            eventData: {
              enqueuedTimeUtc: '2024-11-06T13:48:13.069Z',
              offset: 13,
              partitionContext: {
                fullyQualifiedNamespace: 'namespace',
                consumerGroup: 'consumer-group',
                eventHubName: 'event-hub-path',
                partitionId: 'partition-id',
              },
              partitionKey: 'partition-key2',
              sequenceNumber: 2,
            },
            payload: {
              text: 'text2',
            },
            properties: {
              objProperty: {
                number: 5678,
                text: 'text2',
              },
              textProperty: 'text-property2',
            },
            systemProperties: {
              textProperty: 'text-property2',
            },
          },
          {
            valid: false,
            error: expect.any(HandlerArgsParseError),
            eventData: {
              enqueuedTimeUtc: '2024-11-06T13:48:15.069Z',
              offset: 18,
              partitionContext: {
                fullyQualifiedNamespace: 'namespace',
                consumerGroup: 'consumer-group',
                eventHubName: 'event-hub-path',
                partitionId: 'partition-id',
              },
              partitionKey: 'partition-key3',
              sequenceNumber: 3,
            },
            payload: {
              unknownProperty: 'unknownValue',
            },
            properties: {
              objProperty: {
                number: 9012,
                text: 'text3',
              },
              textProperty: 'text-property3',
            },
            systemProperties: {
              textProperty: 'text-property3',
            },
          },
          {
            valid: false,
            error: expect.any(HandlerArgsParseError),
            eventData: {
              enqueuedTimeUtc: '2024-11-06T13:48:17.069Z',
              offset: 23,
              partitionContext: {
                fullyQualifiedNamespace: 'namespace',
                consumerGroup: 'consumer-group',
                eventHubName: 'event-hub-path',
                partitionId: 'partition-id',
              },
              partitionKey: 'partition-key4',
              sequenceNumber: 4,
            },
            payload: {
              number: 456,
              text: 'text4',
            },
            properties: {
              objProperty: {
                number: 3456,
              },
              textProperty: 'text-property4',
            },
            systemProperties: {
              unknownProperty: 'unknown-value',
            },
          },
        ]);
      });

      it('should fail, if Message is not an array', async () => {
        const argsProvider = subject.buildArgProviders(
          [
            {
              type: 'messages',
              payloadSchema: z.object({ text: z.string(), number: z.number().optional() }),
            },
          ],
          'many',
        );
        const testMessage = {
          text: 'text1',
          number: 123,
        };

        await expect(argsProvider(testMessage, mockContext)).rejects.toThrowWithMessage(
          HandlerArgsParseError,
          'Error parsing handler arguments',
        );
      });

      it('should fail, if rawMetadata cannot be parsed', async () => {
        delete mockContext.triggerMetadata?.partitionKeyArray;
        const argsProvider = subject.buildArgProviders(
          [
            {
              type: 'messages',
              payloadSchema: z.object({ text: z.string(), number: z.number().optional() }),
            },
          ],
          'many',
        );
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
          'Error parsing handler arguments',
        );
      });
    });

    describe('RawMessage', () => {
      beforeEach(() => {
        mockContext.triggerMetadata = lodash.cloneDeep(testTriggerMetadataSingle);
      });

      it('should provide raw Message', async () => {
        const argsProvider = subject.buildArgProviders([
          {
            type: 'rawMessage',
          },
        ]);
        const testMessage = {
          text: 'text1',
          number: 123,
        };

        const args = await argsProvider(testMessage, mockContext);

        expect(args[0]).toBe(testMessage);
      });

      it('should fail, if cardinality is many', async () => {
        expect(() => subject.buildArgProviders([{ type: 'rawMessage' }], 'many')).toThrowWithMessage(
          EventHubTriggerDefinitionError,
          'Decorator "RawMessage" is not allowed with cardinality "many"',
        );
      });
    });

    describe('RawMessages', () => {
      beforeEach(() => {
        mockContext.triggerMetadata = lodash.cloneDeep(testTriggerMetadataMany);
      });

      it('should provide raw Messages', async () => {
        const argsProvider = subject.buildArgProviders([{ type: 'rawMessages' }], 'many');
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

        expect(args[0]).toBe(testMessages);
      });

      it('should fail, if cardinality is one', async () => {
        expect(() => subject.buildArgProviders([{ type: 'rawMessages' }], 'one')).toThrowWithMessage(
          EventHubTriggerDefinitionError,
          'Decorator "RawMessages" is only allowed with cardinality "many"',
        );
      });
    });
  });

  describe('context', () => {
    it('should provide InvocationCtx', async () => {
      const argsProvider = subject.buildArgProviders([
        {
          type: 'invocationContext',
        },
      ]);
      const args = await argsProvider({}, mockContext);

      expect(args[0]).toBe(mockContext);
    });
  });
});
