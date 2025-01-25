import { EventHubTriggerOptions } from '@azure/functions';
import { CommonArgMetadata } from 'shared';
import { ZodType } from 'zod';

export interface EventHubConfig {
  connection: string;
  eventHubName: string;
}

export interface EventHubHandlersMetadata extends EventHubConfig {
  type: 'event-hub-handlers';
}

export interface EventHubHandlerConfig {
  triggerId?: string;
  consumerGroup?: string;
  cardinality?: EventHubTriggerOptions['cardinality'];
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

export type EventHubHandlerArgMetadata = CommonArgMetadata | EventHubHandlerDataArgMetadata;

export interface EventHubHandlerArgsMetadata {
  args: EventHubHandlerArgMetadata[];
}

export type EventHubHandlerMetadata = EventHubHandlerConfig & EventHubHandlerArgsMetadata;
