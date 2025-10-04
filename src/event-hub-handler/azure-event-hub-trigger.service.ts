import { InvocationContext } from '@azure/functions';
import { injectable } from 'inversify';
import { z, ZodError } from 'zod';
import {
  EventHubHandlerArgMetadata,
  EventHubHandlerCardinality,
  EventHubHandlerMessageArgMetadata,
} from './decorators';
import {
  EventHubArgProvider,
  EventHubArgProviderInput,
  EventHubAsyncArgsProvider,
  EventHubEventData,
  eventHubEventDataSchema,
  EventHubMessageWrapper,
  EventHubTriggerDefinitionError,
  HandlerArgsParseError,
} from './event-hub-handler.model';

const triggerMetadataOneSchema = z.object({
  partitionContext: z.object({
    consumerGroupName: z.string(),
    eventHubPath: z.string(),
  }),
  enqueuedTimeUtc: z.iso.datetime(),
  offset: z.string(),
  partitionKey: z.string(),
  sequenceNumber: z.number().int(),
  properties: z.record(z.string(), z.any()),
  systemProperties: z.record(z.string(), z.any()),
});
export type TriggerMetadataOne = z.infer<typeof triggerMetadataOneSchema>;

const triggerMetadataManySchema = z.object({
  partitionContext: z.object({
    consumerGroupName: z.string(),
    eventHubPath: z.string(),
  }),
  enqueuedTimeUtcArray: z.iso.datetime().array(),
  offsetArray: z.string().array(),
  partitionKeyArray: z.string().array(),
  sequenceNumberArray: z.number().int().array(),
  propertiesArray: z.record(z.string(), z.any()).array(),
  systemPropertiesArray: z.record(z.string(), z.any()).array(),
});
export type TriggerMetadataMany = z.infer<typeof triggerMetadataManySchema>;

@injectable()
export class AzureEventHubTriggerService {
  async handleEventHubEvent(context: InvocationContext, method: () => Promise<unknown>): Promise<void> {
    try {
      await method();
    } catch (e) {
      if (e instanceof Error) {
        context.error(
          `Internal error:
${e.stack}`,
        );
      } else {
        context.error(`Internal error: ${String(e)}`);
      }
    }
  }

  buildArgProviders(
    args: EventHubHandlerArgMetadata[],
    cardinality?: EventHubHandlerCardinality,
  ): EventHubAsyncArgsProvider {
    const argProviders: EventHubArgProvider[] = [];
    for (const arg of args) {
      switch (arg.type) {
        case 'context':
          argProviders.push(({ context }) => context);
          break;
        case 'message':
          if (cardinality === 'many') {
            throw new EventHubTriggerDefinitionError('Decorator "Message" is not allowed with cardinality "many".');
          }
          argProviders.push(this.getMessageProvider(arg));
          break;
        case 'messages':
          if (cardinality !== 'many') {
            throw new EventHubTriggerDefinitionError('Decorator "Messages" is only allowed with cardinality "many".');
          }
          argProviders.push(this.getMessagesProvider(arg));
          break;
        case 'undefined':
          argProviders.push(() => undefined);
          break;
      }
    }
    return this.getArgsProvider(argProviders);
  }

  private getArgsProvider(argProviders: EventHubArgProvider[]): EventHubAsyncArgsProvider {
    return async (messages, context) => {
      /* There is a Bug in request.query
         new URL(request.url).searchParams will be used instead for query parameters,
       */
      return await Promise.allSettled(
        argProviders.map(argProvider => {
          const asyncArgProvider = async () => argProvider({ messages, context });
          return asyncArgProvider();
        }),
      ).then(results => {
        const splittedResults = results.reduce(
          (aggregator, currentValue) => {
            if (currentValue.status === 'fulfilled') {
              aggregator.fulfilled.push(currentValue.value);
            } else {
              aggregator.rejected.push(currentValue.reason);
            }
            return aggregator;
          },
          { fulfilled: new Array<unknown>(), rejected: new Array(0) },
        );
        if (splittedResults.rejected.length === 0) {
          return splittedResults.fulfilled;
        } else {
          const message = splittedResults.rejected.map(reason => reason.message ?? String(reason)).join('\n\n');
          throw new HandlerArgsParseError(message);
        }
      });
    };
  }

  private getMessageProvider(
    argMetadata: EventHubHandlerMessageArgMetadata,
  ): (input: EventHubArgProviderInput) => unknown {
    const extendedMessageSchema = this.provideExtendedMessageSchema(argMetadata);
    return async ({ context, messages }): Promise<unknown> => {
      let triggerMetadata: TriggerMetadataOne;
      try {
        triggerMetadata = triggerMetadataOneSchema.parse(context.triggerMetadata);
      } catch (e) {
        throw new HandlerArgsParseError(
          `Error parsing trigger metadata: ${e instanceof ZodError ? z.prettifyError(e) : ''}`,
          { cause: e },
        );
      }
      const extendedMessage: EventHubMessageWrapper<unknown, unknown, unknown> & { eventData: EventHubEventData } = {
        eventData: triggerMetadata,
        properties: triggerMetadata.properties,
        systemProperties: triggerMetadata.systemProperties,
        payload: messages,
      };
      try {
        return extendedMessageSchema.parse(extendedMessage);
      } catch (e: unknown) {
        /* istanbul ignore else */
        if (e instanceof z.ZodError) {
          throw new HandlerArgsParseError(
            `Error parsing extended message:
${z.prettifyError(e)}`,
          );
        } else {
          throw e;
        }
      }
    };
  }

  private getMessagesProvider(
    argMetadata: EventHubHandlerMessageArgMetadata,
  ): (input: EventHubArgProviderInput) => unknown {
    const extendedMessagesSchema = this.provideExtendedMessageSchema(argMetadata).array();
    return async ({ context, messages }): Promise<unknown> => {
      if (!Array.isArray(messages)) {
        throw new HandlerArgsParseError('Message should be an array for cardinality=many');
      }
      let triggerMetadata: TriggerMetadataMany;
      try {
        triggerMetadata = triggerMetadataManySchema.parse(context.triggerMetadata);
      } catch (e: unknown) {
        throw new HandlerArgsParseError(
          `Error parsing trigger metadata:${e instanceof ZodError ? z.prettifyError(e) : ''}`,
          { cause: e },
        );
      }
      try {
        const extendedMessages = messages.map<
          EventHubMessageWrapper<unknown, unknown, unknown> & { eventData: EventHubEventData }
        >((payload, index) => ({
          eventData: {
            enqueuedTimeUtc: triggerMetadata.enqueuedTimeUtcArray[index]!,
            offset: triggerMetadata.offsetArray[index]!,
            partitionKey: triggerMetadata.partitionKeyArray[index]!,
            sequenceNumber: triggerMetadata.sequenceNumberArray[index]!,
            partitionContext: triggerMetadata.partitionContext,
          },
          properties: triggerMetadata.propertiesArray[index],
          systemProperties: triggerMetadata.systemPropertiesArray[index],
          payload,
        }));
        return extendedMessagesSchema.parse(extendedMessages);
      } catch (e: unknown) {
        throw new HandlerArgsParseError(
          `Error parsing extended message:${e instanceof ZodError ? z.prettifyError(e) : ''}`,
          { cause: e },
        );
      }
    };
  }

  private provideExtendedMessageSchema(argMetadata: EventHubHandlerMessageArgMetadata) {
    let extendedMessageSchema = z.object({});
    if (argMetadata.isEventData) {
      extendedMessageSchema = extendedMessageSchema.extend({
        eventData: eventHubEventDataSchema,
      });
    }
    if (argMetadata.propertiesSchema) {
      extendedMessageSchema = extendedMessageSchema.extend({
        properties: argMetadata.propertiesSchema,
      });
    }
    if (argMetadata.systemPropertiesSchema) {
      extendedMessageSchema = extendedMessageSchema.extend({
        systemProperties: argMetadata.systemPropertiesSchema,
      });
    }
    if (argMetadata.payloadSchema) {
      extendedMessageSchema = extendedMessageSchema.extend({
        payload: argMetadata.payloadSchema,
      });
    }
    return extendedMessageSchema;
  }
}
