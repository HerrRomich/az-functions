import { InvocationContext } from '@azure/functions';
import { AzureFunctionError } from 'shared';
import { z } from 'zod';

/**
 * Interface that all Event Hub handler classes must implement.
 * The `handle` method will be called with the Event Hub messages.
 *
 * @example
 * ```typescript
 *
 * const eventPayloadSchema = z.object({ id: z.string(), value: z.number() });
 * type EventPayload = z.infer<typeof eventPayloadSchema>;
 *
 * const eventPropertiesSchema = z.object({ source: z.string() });
 * type EventProperties = z.infer<typeof eventPropertiesSchema>;
 *
 * @eventHubHandler({
 *  connection: 'EVENT_HUB_CONNECTION_STRING',
 *  eventHubName: 'my-event-hub',
 *  triggerId: 'my-event-hub-trigger',
 *  consumerGroup: 'my-consumer-group',
 *  cardinality: 'many',
 * })
 * @injectable()
 * class MyEventHubHandler implements EventHubHandler {
 *   constructor(private readonly logger: Logger) {}
 *
 *   async handle(
 *     @messages({ withPayload: eventPayloadSchema, withProperties: eventPropertiesSchema, withEventData: true })
 *     messages: EventHubMessageWrapper<EventPayload, EventProperties, undefined, true>[],
 *   ): Promise<void> {
 *     for (const message of messages) {
 *       logger.log(`Received message with id: ${message.payload.id} and value: ${message.payload.value}, from event hub: ${message.eventData.partitionContext.eventHubPath}`);
 *       // Process the message...
 *     }
 *   }
 * }
 * ```
 */
export interface EventHubHandler {
  handle(...args: unknown[]): void | Promise<void>;
}

export const HANDLE_METHOD_NAME = 'handle';

export class EventHubTriggerDefinitionError extends AzureFunctionError {}

export interface EventHubArgProviderInput {
  context: InvocationContext;
  messages: unknown;
}

export type EventHubArgProvider = (input: EventHubArgProviderInput) => unknown;
export type EventHubAsyncArgsProvider = (messages: unknown, context: InvocationContext) => Promise<unknown[]>;

export const eventHubEventDataSchema = z.object({
  partitionContext: z.object({
    consumerGroupName: z.string(),
    eventHubPath: z.string(),
  }),
  enqueuedTimeUtc: z.iso.datetime(),
  offset: z.string(),
  partitionKey: z.string(),
  sequenceNumber: z.number().int(),
});

/**
 * Schema representing the raw Event Hub event data.
 * Includes metadata such as partition context, enqueue time, offset, partition key, and sequence number.
 * Can be used to strongly type the raw event data in handler methods.
 *
 * ```typescript
 * type EventHubEventData = {
 *  partitionContext: {
 *   consumerGroupName: string;
 *   eventHubPath: string;
 *  }
 *  enqueuedTimeUtc: string;
 *  offset: string;
 *  partitionKey: string;
 *  sequenceNumber: number;
 *  };
 * ```
 * properties:
 * - `partitionContext`: Metadata about the partition, including consumer group name and Event Hub path.
 *   - `consumerGroupName`: The name of the consumer group.
 *   - `eventHubPath`: The path of the Event Hub.
 * - `enqueuedTimeUtc`: The UTC time when the event was enqueued, in ISO string format.
 * - `offset`: The offset of the event in the partition.
 * - `partitionKey`: The partition key of the event.
 * - `sequenceNumber`: The sequence number of the event in the partition.
 *
 * @example
 * ```typescript
 * const eventData: EventHubEventData = {
 *   partitionContext: {
 *     consumerGroupName: 'my-consumer-group',
 *     eventHubPath: 'my-event-hub',
 *   },
 *   enqueuedTimeUtc: '2023-10-01T12:00:00Z',
 *   offset: '12345',
 *   partitionKey: 'my-partition-key',
 *   sequenceNumber: 67890,
 * };
 * ```
 */
export type EventHubEventData = z.infer<typeof eventHubEventDataSchema>;

/**
 * Wrapper for Event Hub messages, including payload, properties, system properties, and optionally the raw event data.
 * It allows for flexible typing of the message components. Can be used to strongly type the message structure in handler methods.
 *
 * Type Parameters:
 * - `PAYLOAD`: The type of the message payload.
 * - `PROPERTIES`: The type of the custom properties of the message. If not provided, properties will be omitted.
 * - `SYSTEM_PROPERTIES`: The type of the system properties of the message. If not provided, system properties will be omitted.
 * - `EVENT_DATA`: If set to true, includes the raw Event Hub event data in the wrapper.
 *
 * @example
 * ```typescript
 * const eventPayloadSchema = z.object({ id: z.string(), value: z.number() });
 * type EventPayload = z.infer<typeof eventPayloadSchema>;
 *
 * const eventPropertiesSchema = z.object({ source: z.string() });
 * type EventProperties = z.infer<typeof eventPropertiesSchema>;
 *
 * type MyEventHubMessage = EventHubMessageWrapper<EventPayload, EventProperties, undefined, true>;
 */
export type EventHubMessageWrapper<
  PAYLOAD = unknown,
  PROPERTIES = undefined,
  SYSTEM_PROPERTIES = undefined,
  EVENT_DATA extends true | undefined = undefined,
> = {
  payload: PAYLOAD;
} & (PROPERTIES extends undefined ? object : { properties: PROPERTIES }) &
  (SYSTEM_PROPERTIES extends undefined ? object : { systemProperties: SYSTEM_PROPERTIES }) &
  (EVENT_DATA extends undefined ? object : { eventData: EventHubEventData });

export class HandlerArgsParseError extends AzureFunctionError {}
