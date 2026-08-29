import { injectable } from 'inversify';
import { HandlerArgsParseError } from 'shared';
import { z, ZodObject, ZodType } from 'zod';
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
  EventHubEventDataSchema,
  EventHubTriggerDefinitionError,
  SafeWrapper,
} from './event-hub-handler.model';
import {
  TriggerMetadataMany,
  triggerMetadataManySchema,
  TriggerMetadataOne,
  triggerMetadataOneSchema,
} from './event-hub-trigger.model';

type EventHubUnknownMessageSchema = ZodObject<{
  payload: ZodType<unknown>;
  properties?: ZodType<unknown>;
  systemProperties?: ZodType<unknown>;
  eventData?: ZodType<EventHubEventData>;
}>;

@injectable()
export class EventHubTriggerSupportFactory {
  buildArgProviders(
    args: EventHubHandlerArgMetadata[],
    cardinality?: EventHubHandlerCardinality,
  ): EventHubAsyncArgsProvider {
    const argProviders: EventHubArgProvider[] = [];
    for (const arg of args) {
      switch (arg.type) {
        case 'invocationContext':
          argProviders.push(({ context }) => context);
          break;
        case 'message':
          if (cardinality === 'many') {
            throw new EventHubTriggerDefinitionError('Decorator "Message" is not allowed with cardinality "many"', {
              details: {
                arg,
                cardinality,
              },
            });
          }
          argProviders.push(this.getMessageProvider(arg));
          break;
        case 'messages':
          if (cardinality !== 'many') {
            throw new EventHubTriggerDefinitionError('Decorator "Messages" is only allowed with cardinality "many"', {
              details: {
                arg,
                cardinality,
              },
            });
          }
          argProviders.push(this.getMessagesProvider(arg));
          break;
        case 'rawMessage':
          if (cardinality === 'many') {
            throw new EventHubTriggerDefinitionError('Decorator "RawMessage" is not allowed with cardinality "many"', {
              details: {
                arg,
                cardinality,
              },
            });
          }
          argProviders.push(({ messages }) => messages);
          break;
        case 'rawMessages':
          if (cardinality !== 'many') {
            throw new EventHubTriggerDefinitionError(
              'Decorator "RawMessages" is only allowed with cardinality "many"',
              {
                details: {
                  arg,
                  cardinality,
                },
              },
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
      return await Promise.allSettled(
        argProviders.map(argProvider => {
          const asyncArgProvider = async () => argProvider({ messages, context });
          return asyncArgProvider();
        }),
      ).then(results => {
        const splitResults = results.reduce(
          (aggregator, currentValue) => {
            if (currentValue.status === 'fulfilled') {
              aggregator.fulfilled.push(currentValue.value);
            } else {
              aggregator.rejected.push(currentValue.reason);
            }
            return aggregator;
          },
          { fulfilled: new Array<unknown>(), rejected: new Array<unknown>() },
        );
        if (splitResults.rejected.length === 0) {
          return splitResults.fulfilled;
        } else {
          throw new HandlerArgsParseError('Error parsing handler arguments', {
            details: {
              rejected: splitResults.rejected,
            },
          });
        }
      });
    };
  }

  private getMessageProvider(
    argMetadata: EventHubHandlerMessageArgMetadata,
  ): (input: EventHubArgProviderInput) => Promise<unknown> {
    const extendedMessageSchema = this.provideExtendedMessageSchema(argMetadata);
    return async (input): Promise<unknown> => {
      const { context, messages: payload } = input;
      let triggerMetadata: TriggerMetadataOne;
      try {
        triggerMetadata = triggerMetadataOneSchema.parse(context.triggerMetadata);
      } catch (e) {
        throw new HandlerArgsParseError('Error parsing trigger metadata', {
          cause: e,
          details: {
            argMetadata,
          },
        });
      }
      return this.validateMessage(payload, triggerMetadata, extendedMessageSchema, argMetadata);
    };
  }

  private validateMessage(
    payload: unknown,
    triggerMetadata: TriggerMetadataOne,
    schema: EventHubUnknownMessageSchema,
    argMetadata: EventHubHandlerMessageArgMetadata,
  ): SafeWrapper<unknown, unknown> {
    const extendedMessage = {
      payload,
      properties: triggerMetadata.properties,
      systemProperties: triggerMetadata.systemProperties,
      eventData: {
        partitionContext: triggerMetadata.partitionContext,
        enqueuedTimeUtc: triggerMetadata.enqueuedTimeUtc,
        offset: triggerMetadata.offset,
        partitionKey: triggerMetadata.partitionKey,
        sequenceNumber: triggerMetadata.sequenceNumber,
      },
    };
    const safeParsed = schema.safeParse(extendedMessage);
    if (!safeParsed.success) {
      return {
        valid: false,
        error: new HandlerArgsParseError('Error parsing extended message', {
          cause: safeParsed.error,
          details: { argMetadata },
        }),
        ...extendedMessage,
      };
    }
    return {
      valid: true,
      ...safeParsed.data,
    };
  }

  private getMessagesProvider(
    argMetadata: EventHubHandlerMessageArgMetadata,
  ): (input: EventHubArgProviderInput) => unknown {
    const extendedMessageSchema = this.provideExtendedMessageSchema(argMetadata);
    return async ({ context, messages }): Promise<unknown> => {
      if (!Array.isArray(messages)) {
        throw new HandlerArgsParseError('Message should be an array for cardinality "many"', {
          details: {
            argMetadata,
            cardinality: 'many',
          },
        });
      }
      let triggerMetadata: TriggerMetadataMany;
      try {
        triggerMetadata = triggerMetadataManySchema.parse(context.triggerMetadata);
      } catch (e: unknown) {
        throw new HandlerArgsParseError('Error parsing trigger metadata', {
          cause: e,
          details: {
            argMetadata,
          },
        });
      }
      return messages.map((payload, index) => {
        const triggerMetadataEntry = {
          enqueuedTimeUtc: triggerMetadata.enqueuedTimeUtcArray[index]!,
          offset: triggerMetadata.offsetArray[index]!,
          partitionKey: triggerMetadata.partitionKeyArray[index]!,
          sequenceNumber: triggerMetadata.sequenceNumberArray[index]!,
          partitionContext: triggerMetadata.partitionContext,
          properties: triggerMetadata.propertiesArray[index]!,
          systemProperties: triggerMetadata.systemPropertiesArray[index]!,
        };
        return this.validateMessage(payload, triggerMetadataEntry, extendedMessageSchema, argMetadata);
      });
    };
  }

  private provideExtendedMessageSchema(argMetadata: EventHubHandlerMessageArgMetadata): EventHubUnknownMessageSchema {
    return z.object({
      payload: argMetadata.payloadSchema ?? z.unknown(),
      ...(argMetadata.propertiesSchema ? { properties: argMetadata.propertiesSchema } : {}),
      ...(argMetadata.systemPropertiesSchema ? { systemProperties: argMetadata.systemPropertiesSchema } : {}),
      ...(argMetadata.isEventData ? { eventData: EventHubEventDataSchema } : {}),
    });
  }
}
