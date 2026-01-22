import { InvocationContext } from '@azure/functions';
import { AzFunctionsSystemError } from 'shared';
import { z } from 'zod';

export class EventHubTriggerDefinitionError extends AzFunctionsSystemError {}

export interface EventHubArgProviderInput {
  context: InvocationContext;
  messages: unknown;
}

export type EventHubArgProvider = (input: EventHubArgProviderInput) => unknown;
export type EventHubAsyncArgsProvider = (messages: unknown, context: InvocationContext) => Promise<unknown[]>;

export const EventHubEventDataSchema = z.object({
  partitionContext: z.object({
    fullyQualifiedNamespace: z.string(),
    consumerGroup: z.string(),
    eventHubName: z.string(),
    partitionId: z.string(),
  }),
  enqueuedTimeUtc: z.iso.datetime({ local: true }),
  offset: z.int(),
  partitionKey: z.string().optional(),
  sequenceNumber: z.int(),
});

/**
 * Schema representing the raw Event Hub event data.
 * Includes metadata such as partition InvocationCtx, enqueue time, offset, partition key, and sequence number.
 * Can be used to strongly type the raw event data in handler methods.
 *
 * ```ts
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
 * ```ts
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
export type EventHubEventData = z.infer<typeof EventHubEventDataSchema>;

export type EventHubMessageBaseWrapper<PAYLOAD = unknown, PROPERTIES = undefined, SYSTEM_PROPERTIES = undefined> = {
  payload: PAYLOAD;
} & (PROPERTIES extends undefined ? object : { properties: PROPERTIES }) &
  (SYSTEM_PROPERTIES extends undefined ? object : { systemProperties: SYSTEM_PROPERTIES });

export type SafeWrapper<T, P> = ({ valid: true } & T) | ({ valid: false; error: unknown } & P);

export type SafeEventHubMessageWrapper<
  PAYLOAD = unknown,
  PROPERTIES = undefined,
  SYSTEM_PROPERTIES = undefined,
> = SafeWrapper<
  EventHubMessageBaseWrapper<PAYLOAD, PROPERTIES, SYSTEM_PROPERTIES>,
  EventHubMessageBaseWrapper<unknown, unknown, unknown>
>;

/**
 * Wrapper for Event Hub Messages, including payload, properties, system properties, and optionally the raw event data.
 * It allows for flexible typing of the Message components. Can be used to strongly type the Message structure in handler methods.
 *
 * Type Parameters:
 * - `PAYLOAD`: The type of the Message payload.
 * - `PROPERTIES`: The type of the custom properties of the Message. If not provided, properties will be omitted.
 * - `SYSTEM_PROPERTIES`: The type of the system properties of the Message. If not provided, system properties will be omitted.
 * - `EVENT_DATA`: If set to true, includes the raw Event Hub event data in the wrapper.
 *
 * @example
 * ```ts
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
> = SafeEventHubMessageWrapper<PAYLOAD, PROPERTIES, SYSTEM_PROPERTIES> &
  (EVENT_DATA extends undefined ? object : { eventData: EventHubEventData });
