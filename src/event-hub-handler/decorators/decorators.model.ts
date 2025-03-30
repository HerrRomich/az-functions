import { EventHubFunctionOptions, EventHubTriggerOptions } from '@azure/functions';
import { CommonArgMetadata } from 'shared';
import { ZodType } from 'zod';

export type EventHubHandlerCardinality = EventHubTriggerOptions['cardinality'];

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

export type EventHubHandlerArgMetadata = CommonArgMetadata | EventHubHandlerDataArgMetadata;

export interface EventHubHandleMethodArgsMetadata {
  args: EventHubHandlerArgMetadata[];
}

export type EventHubHandleMethodMetadata = EventHubHandlerConfig & EventHubHandleMethodArgsMetadata;
