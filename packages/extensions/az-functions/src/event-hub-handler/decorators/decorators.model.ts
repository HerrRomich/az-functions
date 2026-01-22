import { EventHubFunctionOptions, EventHubTriggerOptions } from '@azure/functions';
import { ArgMetadata, CommonArgMetadata, TriggerHandlerClassMetadata } from 'shared';
import { ZodType } from 'zod';

/**
 * Configuration for an Event Hub handler.
 * - `connection`: The name of the app setting that contains the Event Hub connection string.
 * - `eventHubName`: The name of the Event Hub to listen to.
 */
export interface EventHubHandlerConfig {
  connection: string;
  eventHubName: string;
}

export const EVENT_HUB_HANDLER_TYPE = 'event-hub-handler';

export interface EventHubHandlerMetadata extends TriggerHandlerClassMetadata, EventHubHandlerConfig {
  type: typeof EVENT_HUB_HANDLER_TYPE;
}

export type EventHubHandlerCardinality = EventHubTriggerOptions['cardinality'];

/**
 * Configuration for an Event Hub handler.
 * - `triggerId`: A unique identifier for the trigger.
 * - `consumerGroup`: (Optional) The consumer group to use. Defaults to `$Default`.
 * - `cardinality`: (Optional) The cardinality of the Messages, either 'one' or 'many'. Defaults to 'many'.
 * - `extraInputs`: (Optional) Additional inputs for the function.
 * - `extraOutputs`: (Optional) Additional outputs for the function.
 */
export type OnEventHubTriggerConfig = {
  triggerId?: string;
  consumerGroup?: string;
  cardinality?: EventHubHandlerCardinality;
} & Pick<EventHubFunctionOptions, 'extraInputs' | 'extraOutputs'>;

/**
 * Configuration for an Event Hub trigger message argument.
 * - `withPayload`: (Optional) A Zod schema for the payload of the message. If not provided, the payload will be of type `unknown`.
 * - `withSystemProperties`: (Optional) A Zod schema for the system properties of the message. If not provided, the system properties won't be included in the message argument.
 * - `withProperties`: (Optional) A Zod schema for the custom properties of the message. If not provided, the properties won't be included in the message argument.
 * - `withEventData`: (Optional) If true, includes the raw EventData in the message argument.
 */
export interface EventHubTriggerMessageArgConfig {
  withPayload?: ZodType<unknown>;
  withSystemProperties?: ZodType<unknown>;
  withProperties?: ZodType<unknown>;
  withEventData?: true;
}

export interface EventHubHandlerMessageArgMetadata {
  payloadSchema?: ZodType<unknown>;
  systemPropertiesSchema?: ZodType<unknown>;
  propertiesSchema?: ZodType<unknown>;
  isEventData?: true;
}

export interface EventHubHandlerDataArgMetadata extends EventHubHandlerMessageArgMetadata, ArgMetadata {
  type: 'message' | 'messages';
}

export interface EventHubHandlerRawDataArgMetadata extends ArgMetadata {
  type: 'rawMessage' | 'rawMessages';
}

export type EventHubHandlerArgMetadata =
  | CommonArgMetadata
  | EventHubHandlerRawDataArgMetadata
  | EventHubHandlerDataArgMetadata;

export interface OnEventHubTriggerArgsMetadata {
  args: EventHubHandlerArgMetadata[];
}

export type EventHubTriggerMetadata = { type: typeof EVENT_HUB_HANDLER_TYPE } & OnEventHubTriggerConfig &
  OnEventHubTriggerArgsMetadata;
