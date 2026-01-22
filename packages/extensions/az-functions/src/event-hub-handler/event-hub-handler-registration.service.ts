import { app } from '@azure/functions';
import { Container, inject, injectable } from 'inversify';
import { PLATFORM_CONTAINER, TriggerHandlerClass, TriggerHandlerRegistrationService } from 'shared';
import { EventHubHandlerFactory } from './event-hub-handler.factory';
import {
  EventhubTriggerRegistration,
  EventHubTriggersRegistrationService,
} from './event-hub-triggers-registration.service';

@injectable()
export class EventHubHandlerRegistrationService implements TriggerHandlerRegistrationService {
  constructor(
    @inject(PLATFORM_CONTAINER) private readonly platformContainer: Container,
    private readonly eventHubHandlerProvider: EventHubHandlerFactory,
    private readonly triggersRegistrationService: EventHubTriggersRegistrationService,
  ) {}

  register(eventHubHandlerClass: TriggerHandlerClass) {
    this.platformContainer.bind(eventHubHandlerClass).toSelf();
    const handler = this.platformContainer.get(eventHubHandlerClass);

    this.triggersRegistrationService.registerTriggers(eventHubHandlerClass, triggerRegistration =>
      this.registerTrigger(handler, triggerRegistration),
    );
  }

  private registerTrigger(handler: object, triggerRegistration: EventhubTriggerRegistration) {
    const { triggerId, triggerMethod, handlerMetadata, triggerMetadata } = triggerRegistration;

    const handlersPrototype = handler.constructor.prototype;
    const method = async (...args: unknown[]): Promise<unknown> => {
      return await handlersPrototype[triggerMethod].call(handler, ...args);
    };
    const eventhubHandler = this.eventHubHandlerProvider.createHandler(triggerRegistration, method);
    app.eventHub(triggerId, {
      connection: handlerMetadata.connection,
      eventHubName: handlerMetadata.eventHubName,
      consumerGroup: triggerMetadata.consumerGroup,
      cardinality: triggerMetadata.cardinality,
      extraInputs: triggerMetadata.extraInputs,
      extraOutputs: triggerMetadata.extraOutputs,
      handler: eventhubHandler,
    });
  }
}
