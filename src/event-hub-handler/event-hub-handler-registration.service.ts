import { app } from '@azure/functions';
import { inject, injectable } from 'inversify';
import { AzureFunction, PLATFORM_MODE, PlatformMode } from 'shared';
import { EventHubHandleMethodMetadata, FunctionsRegistrationService } from '../platform';
import { EventHubHandlerMetadata } from './decorators';
import { EventHubHandleMethodArgsMetadataService } from './event-hub-handle-method-args-metadata.service';
import { EventHubTriggerDefinitionError, HANDLE_METHOD_NAME } from './event-hub-handler.model';
import { EventHubHandlerProvider } from './event-hub-handler.provider';

export interface EventHubTriggerRegistrationData {
  handler: AzureFunction;
  handleMethodMetadata: EventHubHandleMethodMetadata;
}

@injectable()
export class EventHubHandlerRegistrationService implements FunctionsRegistrationService {
  constructor(
    @inject(PLATFORM_MODE) private readonly platformMode: PlatformMode,
    private readonly eventHubHandleMethodMetadataService: EventHubHandleMethodArgsMetadataService,
    private readonly eventHubHandlerProvider: EventHubHandlerProvider,
  ) {}

  register(functions: AzureFunction, functionMetadata: EventHubHandlerMetadata): void {
    const prototype = functions.constructor.prototype;
    if (this.platformMode !== 'start') {
      return;
    }
    for (const member of Object.getOwnPropertyNames(prototype)) {
      if (member === HANDLE_METHOD_NAME && typeof prototype[member] === 'function') {
        const handleMethodMetadata = this.eventHubHandleMethodMetadataService.getMethodArgsMetadata(functions);
        const registrationData: EventHubTriggerRegistrationData = {
          handler: functions,
          handleMethodMetadata: {
            ...functionMetadata,
            args: handleMethodMetadata?.args ?? [],
          },
        };
        this.registerTrigger(registrationData);
        return;
      }
    }
    throw new EventHubTriggerDefinitionError(
      `Event hub handler service "${functions.constructor.name}" with triggerId=${functionMetadata.triggerId} has no "handle" method. Please, implement "EventHubHandler" interface.`,
    );
  }

  private registerTrigger(registrationData: EventHubTriggerRegistrationData) {
    const { handler, handleMethodMetadata } = registrationData;

    const handlersPrototype = handler.constructor.prototype;
    const method = async (...args: unknown[]): Promise<unknown> => {
      return await handlersPrototype[HANDLE_METHOD_NAME].call(handler, ...args);
    };
    const httpRequestHandler = this.eventHubHandlerProvider.getEventHubTriggerHandler(registrationData, method);
    app.eventHub(handleMethodMetadata.triggerId, {
      connection: handleMethodMetadata.connection,
      eventHubName: handleMethodMetadata.eventHubName,
      cardinality: handleMethodMetadata.cardinality,
      consumerGroup: handleMethodMetadata.consumerGroup,
      extraInputs: handleMethodMetadata.extraInputs,
      extraOutputs: handleMethodMetadata.extraOutputs,
      handler: (messages, context) => httpRequestHandler(messages, context),
    });
  }
}
