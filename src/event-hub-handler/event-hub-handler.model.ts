import { InvocationContext } from '@azure/functions';
import { z } from 'zod';

export interface EventHubHandler {
  handle(...args: any[]): void | Promise<void>;
}

export const HANDLE_METHOD_NAME = 'handle';

export class EventHubTriggerDefinitionError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'EventHubTriggerDefinitionError';
    Object.setPrototypeOf(this, EventHubTriggerDefinitionError.prototype);
  }
}

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
  enqueuedTimeUtc: z.string().datetime(),
  offset: z.string(),
  partitionKey: z.string(),
  sequenceNumber: z.number().int(),
});

export type EventHubEventData = z.infer<typeof eventHubEventDataSchema>;

export type EventHubMessageWrapper<
  T = unknown,
  P = undefined,
  SP = undefined,
  ED extends true | undefined = undefined,
> = {
  payload: T;
} & (P extends undefined ? object : { properties: P }) &
  (SP extends undefined ? object : { systemProperties: SP }) &
  (ED extends undefined ? object : { eventData: EventHubEventData });

export class HandlerArgsParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = HandlerArgsParseError.prototype.constructor.name;
    Object.setPrototypeOf(this, HandlerArgsParseError.prototype);
  }
}
