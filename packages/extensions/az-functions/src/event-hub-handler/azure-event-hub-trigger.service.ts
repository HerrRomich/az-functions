import { InvocationContext } from '@azure/functions';
import { injectable } from 'inversify';
import { errorToString } from 'shared';
import { z } from 'zod';
import {
  TriggerMetadataMany,
  triggerMetadataManySchema,
  TriggerMetadataOne,
  triggerMetadataOneSchema,
} from './azure-event-hub-trigger.model';
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

@injectable()
export class AzureEventHubTriggerService {
  async handleEventHubEvent(context: InvocationContext, method: () => Promise<unknown>): Promise<void> {
    try {
      await method();
    } catch (e) {
      context.error('Error processing Event Hub event:', e);
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
            throw new EventHubTriggerDefinitionError('Decorator "message" is not allowed with cardinality "many".');
          }
          argProviders.push(this.getMessageProvider(arg));
          break;
        case 'messages':
          if (cardinality !== 'many') {
            throw new EventHubTriggerDefinitionError('Decorator "messages" is only allowed with cardinality "many".');
          }
          argProviders.push(this.getMessagesProvider(arg));
          break;
        case 'rawMessage':
          if (cardinality === 'many') {
            throw new EventHubTriggerDefinitionError('Decorator "rawMessage" is not allowed with cardinality "many".');
          }
          argProviders.push(({ messages }) => messages);
          break;
        case 'rawMessages':
          if (cardinality !== 'many') {
            throw new EventHubTriggerDefinitionError(
              'Decorator "rawMessages" is only allowed with cardinality "many".',
            );
          }
          argProviders.push(({ messages }) => messages);
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
          const message = splittedResults.rejected.map(reason => errorToString(reason)).join('\n\n');
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
        /* istanbul ignore else */
        if (e instanceof z.ZodError) {
          throw new HandlerArgsParseError(
            `Error parsing trigger metadata:
${z.prettifyError(e)}`,
            { cause: e },
          );
        } else {
          throw e;
        }
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
        /* istanbul ignore else */
        if (e instanceof z.ZodError) {
          throw new HandlerArgsParseError(
            `Error parsing trigger metadata:
${z.prettifyError(e)}`,
          );
        } else {
          throw e;
        }
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
    if (argMetadata.systemPropertiesSchema !== undefined) {
      extendedMessageSchema = extendedMessageSchema.extend({
        systemProperties: argMetadata.systemPropertiesSchema,
      });
    }
    extendedMessageSchema = extendedMessageSchema.extend({
      payload: argMetadata.payloadSchema ?? z.unknown(),
    });
    return extendedMessageSchema;
  }
}
