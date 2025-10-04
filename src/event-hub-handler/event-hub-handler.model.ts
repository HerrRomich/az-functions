import { InvocationContext } from '@azure/functions';
import { z } from 'zod';
import { AzureFunctionError } from 'shared';

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

export type EventHubEventData = z.infer<typeof eventHubEventDataSchema>;

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
