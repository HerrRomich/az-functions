import { EventHubFunctionOptions, EventHubTriggerOptions } from '@azure/functions';
import { ArgMetadata, CommonArgMetadata } from 'shared';
import { ZodType } from 'zod';

export type EventHubHandlerCardinality = EventHubTriggerOptions['cardinality'];

/**
 * Configuration for an Event Hub handler.
 * - `connection`: The name of the app setting that contains the Event Hub connection string.
 * - `eventHubName`: The name of the Event Hub to connect to.
 * - `triggerId`: A unique identifier for the trigger.
 * - `consumerGroup`: (Optional) The consumer group to use. Defaults to `$Default`.
 * - `cardinality`: (Optional) The cardinality of the messages, either 'one' or 'many'. Defaults to 'many'.
 * - `extraInputs`: (Optional) Additional inputs for the function.
 * - `extraOutputs`: (Optional) Additional outputs for the function.
 */
export type EventHubHandlerConfig = {
  connection: string;
  eventHubName: string;
  triggerId: string;
  consumerGroup?: string;
  cardinality?: EventHubHandlerCardinality;
} & Pick<EventHubFunctionOptions, 'extraInputs' | 'extraOutputs'>;

export interface EventHubHandlerMetadata extends EventHubHandlerConfig {
  type: 'event-hub-handler';
}

export interface EventHubHandlerMessageArgConfig {
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

export interface EventHubHandlerDataArgMetadata extends EventHubHandlerMessageArgMetadata {
  type: 'message' | 'messages';
}

export interface EventHubHandlerRawDataArgMetadata extends ArgMetadata {
  type: 'rawMessage' | 'rawMessages';
}

export type EventHubHandlerArgMetadata =
  | CommonArgMetadata
  | EventHubHandlerRawDataArgMetadata
  | EventHubHandlerDataArgMetadata;

export interface EventHubHandleMethodArgsMetadata {
  args: EventHubHandlerArgMetadata[];
}

export type EventHubHandleMethodMetadata = EventHubHandlerConfig & EventHubHandleMethodArgsMetadata;
