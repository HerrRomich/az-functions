import { decorate, injectable } from 'inversify';
import { adjustMetadata, AZURE_FUNCTION_METADATA_KEY, AzureFunction, getCommonArg } from 'shared';
import {
  EventHubHandlerArgMetadata,
  EventHubHandlerConfig,
  EventHubHandlerMessageArgConfig,
  EventHubHandlerMetadata,
} from './decorators.model';

export const EVENT_HUB_HANDLE_METHOD_METADATA_KEY = Symbol.for('metadata:event-hub-handle-method-metadata');

/**
 * Class decorator to define an Event Hub function handler.
 * This decorator registers the class as an Event Hub handler with the specified configuration.
 *
 * @param config Configuration for the Event Hub handler, including the name and event hub details.
 *
 * @example
 * ```typescript
 * const eventPayloadSchema = z.object({ id: z.string(), value: z.number() });
 * type EventPayload = z.infer<typeof eventPayloadSchema>;
 *
 * @eventHubHandler({
 *   name: 'MyEventHubHandler',
 *   eventHubName: 'my-event-hub',
 *   connection: 'EventHubConnectionString',
 *   consumerGroup: '$Default',
 * })
 * class MyEventHubHandler implements EventHubHandler {
 *   async handle(
 *     @messages({ withPayload: eventPayloadSchema, withEventData: true }) messages: EventHubMessageWrapper<EventPayload, undefined, undefined, true>[],
 *     context: InvocationContext
 *   ): Promise<void> {
 *     for (const message of messages) {
 *       console.log(`Received message with id: ${message.payload.id} and value: ${message.payload.value}, enqueued at: ${message.eventData.enqueuedTimeUtc}`);
 *     }
 *   }
 * }
 * ```
 */
export function eventHubHandler(config: EventHubHandlerConfig) {
  return function <T extends AzureFunction>(target: T) {
    const metadata: EventHubHandlerMetadata = {
      type: 'event-hub-handler',
      ...config,
    };
    Reflect.defineMetadata(AZURE_FUNCTION_METADATA_KEY, metadata, target);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    decorate(injectable(), target as Function);
  };
}

/**
 * Parameter decorator to inject Event Hub message data into the handler method.
 *
 * This decorator can be used to specify the structure of the Event Hub message payload,
 * system properties, and custom properties using Zod schemas.
 *
 * @param messageConfig
 * Configuration for the Event Hub message argument, including optional Zod schemas for payload, system properties, and custom properties.
 * - `withPayload`: A Zod schema to validate and parse the message payload.
 * - `withSystemProperties`: A Zod schema to validate and parse the system properties of the message. If not provided, system properties will not be included.
 * - `withProperties`: A Zod schema to validate and parse custom properties of the message. If not provided, custom properties will not be included.
 * - `withEventData`: If set to true, includes the raw Event Hub event data in the argument.
 *
 * @example
 * ```typescript
 * const eventPayloadSchema = z.object({ id: z.string(), value: z.number() });
 * type EventPayload = z.infer<typeof eventPayloadSchema>;
 *
 * const eventAppPropertiesSchema = z.object({ appId: z.string() });
 * type EventAppProperties = z.infer<typeof eventAppPropertiesSchema>;
 *
 * class MyEventHubHandler implements EventHubHandler {
 *  async handle(
 *     @message({ withPayload: eventPayloadSchema, withProperties: eventAppPropertiesSchema
 *     }) message: EventHubMessageWrapper<EventPayload, undefined, EventAppProperties>,
 *     context: InvocationContext
 *   ): Promise<void> {
 *     context.log(`Received message with id: ${message.payload.id} and value: ${message.payload.value}`);
 *   }
 * }
 * ```
 */
export function message(
  messageConfig: EventHubHandlerMessageArgConfig,
): (target: AzureFunction, propertyKey: string | symbol, parameterIndex: number) => void {
  return adjustHandlerMetadata(convertEventHubConfigToMeta('message', messageConfig));
}

/**
 * Parameter decorator to inject multiple Event Hub messages into the handler method.
 *
 * This decorator can be used to specify the structure of the Event Hub message payload,
 * system properties, and custom properties using Zod schemas.
 * @param messagesConfig
 * Configuration for the Event Hub messages argument, including optional Zod schemas for payload, system properties, and custom properties.
 * - `withPayload`: A Zod schema to validate and parse the message payload.
 * - `withSystemProperties`: A Zod schema to validate and parse the system properties of the message. If not provided, system properties will not be included.
 * - `withProperties`: A Zod schema to validate and parse custom properties of the message. If not provided, custom properties will not be included.
 * - `withEventData`: If set to true, includes the raw Event Hub event data in the argument.
 *
 * @example
 * ```typescript
const eventPayloadSchema = z.object({ id: z.string(), value: z.number() });
type EventPayload = z.infer<typeof eventPayloadSchema>;

 * class MyEventHubHandler implements EventHubHandler {
 *  async handle(
 *     @messages({ withPayload: eventPayloadSchema }) messages: EventHubMessageWrapper<EventPayload>[],
 *     context: InvocationContext
 *   ): Promise<void> {
 *   for (const message of messages) {
 *    context.log(`Received message with id: ${message.payload.id} and value: ${message.payload.value}`);
 *   }
 *  }
 * }
 * ```
 */
export function messages(messagesConfig: EventHubHandlerMessageArgConfig): ParameterDecorator {
  return adjustHandlerMetadata(convertEventHubConfigToMeta('messages', messagesConfig));
}

/**
 * Parameter decorator to inject the raw Event Hub message into the handler method.
 * This decorator can be used when you need access to the complete Event Hub message object,
 *
 * @example
 * ```typescript
 * class MyEventHubHandler implements EventHubHandler {
 *  async handle(
 *     @rawMessage() message: unknown,
 *     context: InvocationContext
 *   ): Promise<void> {
 *     context.log(`Received raw message: ${JSON.stringify(message)}`);
 *   }
 * }
 * ```
 */
export function rawMessage(): ParameterDecorator {
  return adjustHandlerMetadata({
    type: 'rawMessage',
  });
}

/**
 * Parameter decorator to inject multiple raw Event Hub messages into the handler method.
 * This decorator can be used when you need access to the complete Event Hub message objects,
 *
 * @example
 * ```typescript
 * class MyEventHubHandler implements EventHubHandler {
 *  async handle(
 *     @rawMessages() messages: unknown[],
 *     context: InvocationContext
 *   ): Promise<void> {
 *     for (const message of messages) {
 *       context.log(`Received raw message: ${JSON.stringify(message)}`);
 *     }
 *   }
 * }
 * ```
 */
export function rawMessages(): ParameterDecorator {
  return adjustHandlerMetadata({
    type: 'rawMessages',
  });
}

function convertEventHubConfigToMeta(
  type: EventHubHandlerArgMetadata['type'],
  messagesConfig: EventHubHandlerMessageArgConfig,
): EventHubHandlerArgMetadata {
  return {
    type,
    payloadSchema: messagesConfig.withPayload,
    systemPropertiesSchema: messagesConfig.withSystemProperties,
    propertiesSchema: messagesConfig.withProperties,
    isEventData: messagesConfig.withEventData,
  };
}

function adjustHandlerMetadata(handlerArg: EventHubHandlerArgMetadata): ParameterDecorator {
  return adjustMetadata(EVENT_HUB_HANDLE_METHOD_METADATA_KEY, handlerArg, getCommonArg);
}
