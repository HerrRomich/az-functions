import { decorate, injectable } from 'inversify';
import * as shared from 'shared';
import { adjustMetadata, FUNCTION_HANDLER_METADATA, getCommonArg } from 'shared';
import {
  EventHubHandlerArgMetadata,
  EventHubHandlerConfig,
  EventHubHandlerMetadata,
  EventHubTriggerMessageArgConfig,
  EventHubTriggerMetadata,
  OnEventHubTriggerArgsMetadata,
  OnEventHubTriggerConfig,
} from './decorators.model';

/**
 * Class decorator to define an Event Hub function handler.
 * This decorator registers the class as an Event Hub handler with the specified configuration.
 *
 * @param config Configuration for the Event Hub handler, including the name and event hub details.
 *
 * @example
 * ```ts
 * @EventHubHandler({
 *   eventHubName: 'my-event-hub',
 *   connection: 'EventHubConnectionString',
 *   consumerGroup: '$Default',
 * })
 * class MyEventHubHandler implements OnEventHubTrigger {
 *
 *   @OnEventHubTrigger({ cardinality: 'many' })
 *   async handle(
 *     @Messages({ withPayload: z.object({ id: z.string(), value: z.number() }) }) messages: EventHubMessageWrapper<{ id: string; value: number }>[],
 *     InvocationCtx: InvocationContext
 *   ): Promise<void> {
 *     for (const message of messages) {
 *       console.log(`Received Message with id: ${message.payload.id} and value: ${message.payload.value}`);
 *     }
 *   }
 * }
 * ```
 */
export function EventHubHandler(config: EventHubHandlerConfig): ClassDecorator {
  return target => {
    const metadata: EventHubHandlerMetadata = {
      type: 'event-hub-handler',
      ...config,
    };
    Reflect.defineMetadata(FUNCTION_HANDLER_METADATA, metadata, target);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    decorate(injectable(), target as Function);
  };
}

/**
 * Class decorator to define an Event Hub function handler.
 * This decorator registers the class as an Event Hub handler with the specified configuration.
 *
 * @param config Configuration for the Event Hub handler, including the name and event hub details.
 *
 * @example
 * ```ts
 * const eventPayloadSchema = z.object({ id: z.string(), value: z.number() });
 * type EventPayload = z.infer<typeof eventPayloadSchema>;
 *
 * @EventHubHandler({
 *   eventHubName: 'my-event-hub',
 *   connection: 'EventHubConnectionString',
 *   consumerGroup: '$Default',
 * })
 * class MyEventHubHandler {
 *   @OnEventHubTrigger({
 *     triggerId: 'my-event-hub-trigger',
 *     cardinality: 'many'
 *   })
 *   async handle(
 *     @Messages({ withPayload: eventPayloadSchema, withEventData: true }) messages: EventHubMessageWrapper<EventPayload, undefined, undefined, true>[],
 *     InvocationCtx: InvocationContext
 *   ): Promise<void> {
 *     for (const message of messages) {
 *       console.log(`Received Message with id: ${message.payload.id} and value: ${message.payload.value}, enqueued at: ${message.eventData.enqueuedTimeUtc}`);
 *     }
 *   }
 * }
 * ```
 */
export function OnEventHubTrigger(config: OnEventHubTriggerConfig): MethodDecorator {
  return (target, propertyKey) => {
    const ownMetadata = Reflect.getOwnMetadata(FUNCTION_HANDLER_METADATA, target, propertyKey) as
      | OnEventHubTriggerArgsMetadata
      | undefined;
    const argsMetadata =
      ownMetadata ?? shared.initializeMetadata<EventHubHandlerArgMetadata>(target, propertyKey, getCommonArg);
    const metadata: EventHubTriggerMetadata = {
      type: 'event-hub-handler',
      ...config,
      ...argsMetadata,
    };
    Reflect.defineMetadata(FUNCTION_HANDLER_METADATA, metadata, target, propertyKey);
  };
}

/**
 * Parameter decorator to inject Event Hub Message data into the handler method.
 *
 * This decorator can be used to specify the structure of the Event Hub Message payload,
 * system properties, and custom properties using Zod schemas.
 *
 * @param messageConfig
 * Configuration for the Event Hub Message argument, including optional Zod schemas for payload, system properties, and custom properties.
 * - `withPayload`: A Zod schema to validate and parse the Message payload.
 * - `withSystemProperties`: A Zod schema to validate and parse the system properties of the Message. If not provided, system properties will not be included.
 * - `withProperties`: A Zod schema to validate and parse custom properties of the Message. If not provided, custom properties will not be included.
 * - `withEventData`: If set to true, includes the raw Event Hub event data in the argument.
 *
 * @example
 * ```ts
 * const eventPayloadSchema = z.object({ id: z.string(), value: z.number() });
 * type EventPayload = z.infer<typeof eventPayloadSchema>;
 *
 * const eventAppPropertiesSchema = z.object({ APP_REGISTRATION_ID: z.string() });
 * type EventAppProperties = z.infer<typeof eventAppPropertiesSchema>;
 *
 * class MyEventHubHandler implements OnEventHubTrigger {
 *  async handle(
 *     @Message({ withPayload: eventPayloadSchema, withProperties: eventAppPropertiesSchema
 *     }) Message: EventHubMessageWrapper<EventPayload, undefined, EventAppProperties>,
 *     @InvocationCtx() context: InvocationContext
 *   ): Promise<void> {
 *     context.log(`Received Message with id: ${Message.payload.id} and value: ${Message.payload.value}`);
 *   }
 * }
 * ```
 */
export function Message(messageConfig: EventHubTriggerMessageArgConfig): ParameterDecorator {
  return adjustHandlerMetadata(convertEventHubConfigToMeta('message', messageConfig));
}

/**
 * Parameter decorator to inject multiple Event Hub Messages into the handler method.
 *
 * This decorator can be used to specify the structure of the Event Hub Message payload,
 * system properties, and custom properties using Zod schemas.
 * @param messagesConfig
 * Configuration for the Event Hub Messages argument, including optional Zod schemas for payload, system properties, and custom properties.
 * - `withPayload`: A Zod schema to validate and parse the Message payload.
 * - `withSystemProperties`: A Zod schema to validate and parse the system properties of the Message. If not provided, system properties will not be included.
 * - `withProperties`: A Zod schema to validate and parse custom properties of the Message. If not provided, custom properties will not be included.
 * - `withEventData`: If set to true, includes the raw Event Hub event data in the argument.
 *
 * @example
 * ```ts
const eventPayloadSchema = z.object({ id: z.string(), value: z.number() });
type EventPayload = z.infer<typeof eventPayloadSchema>;

 * class MyEventHubHandler implements OnEventHubTrigger {
 *  async handle(
 *     @Messages({ withPayload: eventPayloadSchema }) messages: EventHubMessageWrapper<EventPayload>[],
 *     @InvocationCtx() context: InvocationContext
 *   ): Promise<void> {
 *   for (const message of messages) {
 *    context.log(`Received Message with id: ${message.payload.id} and value: ${message.payload.value}`);
 *   }
 *  }
 * }
 * ```
 */
export function Messages(messagesConfig: EventHubTriggerMessageArgConfig): ParameterDecorator {
  return adjustHandlerMetadata(convertEventHubConfigToMeta('messages', messagesConfig));
}

/**
 * Parameter decorator to inject the raw Event Hub Message into the handler method.
 * This decorator can be used when you need access to the complete Event Hub Message object,
 *
 * @example
 * ```ts
 * class MyEventHubHandler implements OnEventHubTrigger {
 *  async handle(
 *     @RawMessage() message: unknown,
 *     @InvocationCtx() context: InvocationContext
 *   ): Promise<void> {
 *     context.log(`Received raw Message: ${JSON.stringify(message)}`);
 *   }
 * }
 * ```
 */
export function RawMessage(): ParameterDecorator {
  return adjustHandlerMetadata({
    type: 'rawMessage',
  });
}

/**
 * Parameter decorator to inject multiple raw Event Hub Messages into the handler method.
 * This decorator can be used when you need access to the complete Event Hub Message objects,
 *
 * @example
 * ```ts
 * class MyEventHubHandler implements OnEventHubTrigger {
 *  async handle(
 *     @RawMessages() messages: unknown[],
 *     @InvocationCtx() context: InvocationContext
 *   ): Promise<void> {
 *     for (const message of messages) {
 *       context.log(`Received raw Message: ${JSON.stringify(message)}`);
 *     }
 *   }
 * }
 * ```
 */
export function RawMessages(): ParameterDecorator {
  return adjustHandlerMetadata({
    type: 'rawMessages',
  });
}

function convertEventHubConfigToMeta(
  type: EventHubHandlerArgMetadata['type'],
  messagesConfig: EventHubTriggerMessageArgConfig,
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
  return adjustMetadata(FUNCTION_HANDLER_METADATA, handlerArg, getCommonArg);
}
