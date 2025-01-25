import { InvocationContext } from '@azure/functions';
import { Container, inject, injectable } from 'inversify';
import { PLATFORM_CONTAINER, PlatformContextLocalStorage } from 'shared';
import { AzureEventHubTriggerService } from './azure-event-hub-trigger.service';
import { EventHubTriggerRegistrationData } from './event-hub-handlers-registration.service';

@injectable()
export class EventHubHandlerProvider {
  constructor(
    @inject(PLATFORM_CONTAINER) private readonly platformContainer: Container,
    private readonly eventHubTriggerService: AzureEventHubTriggerService
  ) {}

  getEventHubTriggerHandler(
    registrationData: EventHubTriggerRegistrationData,
    method: (...args: unknown[]) => Promise<unknown>
  ): (messages: unknown, context: InvocationContext) => Promise<void> {
    const { operationMetadata } = registrationData;
    const argsProvider = this.eventHubTriggerService.buildArgProviders(operationMetadata);
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
