import { InvocationContext } from '@azure/functions';
import { PLATFORM_CONTEXT_MANAGER, PLATFORM_CONTEXT_PROVIDER } from 'context';
import { Container, inject, injectable } from 'inversify';
import { adjustContextLoggerMetadata, LOGGER_FACTORY, LoggerFactory } from 'logger';
import { PLATFORM_CONTAINER } from 'shared';
import { EventHubTriggerSupportFactory } from './event-hub-trigger-support.factory';
import { EventhubTriggerRegistration } from './event-hub-triggers-registration.service';

export type EventHubTriggerHandler = (messages: unknown, invocationContext: InvocationContext) => Promise<void>;

@injectable()
export class EventHubHandlerFactory {
  private readonly logger;

  constructor(
    @inject(LOGGER_FACTORY) loggerFactory: LoggerFactory,
    @inject(PLATFORM_CONTAINER) private readonly platformContainer: Container,
    private readonly eventHubTriggerService: EventHubTriggerSupportFactory,
  ) {
    this.logger = loggerFactory();
  }

  createHandler(
    registrationData: EventhubTriggerRegistration,
    method: (...args: unknown[]) => Promise<unknown>,
  ): EventHubTriggerHandler {
    const { triggerId, triggerMetadata } = registrationData;
    const argsProvider = this.eventHubTriggerService.buildArgProviders(
      triggerMetadata.args,
      triggerMetadata.cardinality,
    );
    const contextManager = this.platformContainer.get(PLATFORM_CONTEXT_MANAGER);
    const contextProvider = this.platformContainer.get(PLATFORM_CONTEXT_PROVIDER);
    return async (messages: unknown, invocationContext: InvocationContext): Promise<void> => {
      return contextManager.runWith(contextProvider.providePlatformContext(invocationContext), async () => {
        adjustContextLoggerMetadata(contextManager, {
          error: {
            registrationData,
          },
          warn: {
            triggerId,
          },
          silly: {
            registrationData,
          },
        });
        try {
          const args = await argsProvider(messages, invocationContext);
          this.logger.debug('Processing Event Hub event started');
          this.logger.silly('Processing Event Hub event started', {
            args,
            triggerMetadata: invocationContext.triggerMetadata,
            messages,
          });
          await method(...args);
        } catch (e) {
          this.logger.error('Error processing Event Hub event', {
            triggerMetadata: invocationContext.triggerMetadata,
            messages,
            error: e,
          });
        }
      });
    };
  }
}
