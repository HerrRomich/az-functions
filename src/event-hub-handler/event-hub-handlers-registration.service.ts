import { app } from '@azure/functions';
import { inject, injectable } from 'inversify';
import { AzureFunctions, PLATFORM_MODE, PlatformMode } from 'shared';
import { FunctionsRegistrationService } from '../platform';
import { EventHubHandlerMetadata, EventHubHandlersMetadata } from './decorators';
import { EventHubHandlerProvider } from './event-hub-handler.provider';
import { EventHubHandlersMetadataService } from './event-hub-handlers-metadata.service';

export interface EventHubTriggerRegistrationData {
  handlers: AzureFunctions;
  functionsMetadata: EventHubHandlersMetadata;
  operation: string;
  operationMetadata: EventHubHandlerMetadata;
}

@injectable()
export class EventHubHandlersRegistrationService implements FunctionsRegistrationService {
  constructor(
    @inject(PLATFORM_MODE) private readonly platformMode: PlatformMode,
    private readonly eventHubHandlersMetadataService: EventHubHandlersMetadataService,
    private readonly eventHubHandlerProvider: EventHubHandlerProvider
  ) {}

  register(functions: AzureFunctions, functionsMetadata: EventHubHandlersMetadata): void {
    const prototype = functions.constructor.prototype;
    if (this.platformMode !== 'start') {
      return;
    }
    for (const member of Object.getOwnPropertyNames(prototype)) {
      if (typeof prototype[member] === 'function') {
        const operationMetadata = this.eventHubHandlersMetadataService.getOperationMetadata(functions, member);
        if (!operationMetadata) {
          continue;
        }
        const registrationData: EventHubTriggerRegistrationData = {
          handlers: functions,
          functionsMetadata,
          operation: member,
          operationMetadata,
        };
        this.registerTrigger(registrationData);
      }
    }
  }

  private registerTrigger(registrationData: EventHubTriggerRegistrationData) {
    const { handlers, functionsMetadata, operation, operationMetadata } = registrationData;

    const handlersPrototype = handlers.constructor.prototype;
    const method = async (...args: unknown[]): Promise<unknown> => {
      return await handlersPrototype[operation].call(handlers, ...args);
    };
    const httpRequestHandler = this.eventHubHandlerProvider.getEventHubTriggerHandler(registrationData, method);
    app.eventHub(operationMetadata.triggerId ?? operation, {
      connection: functionsMetadata.connection,
      eventHubName: functionsMetadata.eventHubName,
      cardinality: operationMetadata.cardinality,
      consumerGroup: operationMetadata.consumerGroup,
      handler: (messages, context) => httpRequestHandler(messages, context),
    });
  }
}
