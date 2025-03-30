import { InvocationContext } from '@azure/functions';
import { Container, inject, injectable } from 'inversify';
import { PLATFORM_CONTAINER } from 'shared';
import { PlatformContextLocalStorage } from '../shared';
import { AzureEventHubTriggerService } from './azure-event-hub-trigger.service';
import { EventHubTriggerRegistrationData } from './event-hub-handler-registration.service';

@injectable()
export class EventHubHandlerProvider {
  constructor(
    @inject(PLATFORM_CONTAINER) private readonly platformContainer: Container,
    private readonly eventHubTriggerService: AzureEventHubTriggerService,
  ) {}

  getEventHubTriggerHandler(
    registrationData: EventHubTriggerRegistrationData,
    method: (...args: unknown[]) => Promise<unknown>,
  ): (messages: unknown, context: InvocationContext) => Promise<void> {
    const {
      handleMethodMetadata: { args, cardinality },
    } = registrationData;
    const argsProvider = this.eventHubTriggerService.buildArgProviders(args, cardinality);
    return async (messages: unknown, context: InvocationContext): Promise<void> => {
      const contextStorage = await this.platformContainer.getAsync(PlatformContextLocalStorage);
      return contextStorage.run({ invocationContext: context }, async () => {
        return this.eventHubTriggerService.handleEventHubEvent(context, async () => {
          const args = await argsProvider(messages, context);
          return await method(...args);
        });
      });
    };
  }
}
