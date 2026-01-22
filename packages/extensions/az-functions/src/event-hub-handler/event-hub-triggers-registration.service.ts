import { inject, injectable } from 'inversify';
import { LOGGER_FACTORY, LoggerFactory } from 'logger';
import { TriggerHandlerClass, TriggerHandlerMetadataError } from 'shared';
import { EventHubHandlerMetadata, EventHubTriggerMetadata } from './decorators/index';
import { EventHubHandlerMetadataReader } from './event-hub-handler-metadata.reader';

export interface EventhubTriggerRegistration {
  triggerId: string;
  triggerMethod: string;
  handlerMetadata: EventHubHandlerMetadata;
  triggerMetadata: EventHubTriggerMetadata;
}

export type RegisterCallback = (triggerRegistration: EventhubTriggerRegistration) => void;

@injectable()
export class EventHubTriggersRegistrationService {
  private readonly logger;

  constructor(
    @inject(LOGGER_FACTORY) loggerFactory: LoggerFactory,
    private readonly metadataReader: EventHubHandlerMetadataReader,
  ) {
    this.logger = loggerFactory();
  }

  registerTriggers(handlerClass: TriggerHandlerClass, registerCallback: RegisterCallback): void {
    const handlerMetadata = this.metadataReader.getHandlerClassMetadata(handlerClass);
    const prototype = handlerClass.prototype;
    this.logger.debug('Registering operations for event hub handler started', {
      class: handlerClass.name,
      metadata: handlerMetadata,
    });
    let operationsCount = 0;
    for (const triggerMethod of Object.getOwnPropertyNames(prototype)) {
      const triggerMetadata = this.getOperationMetadata(handlerClass, triggerMethod);
      if (triggerMetadata === undefined) {
        continue;
      }
      const triggerId = triggerMetadata.triggerId ?? triggerMethod;
      const triggerRegistration: EventhubTriggerRegistration = {
        triggerId,
        triggerMethod,
        handlerMetadata: handlerMetadata,
        triggerMetadata,
      };
      registerCallback(triggerRegistration);
      operationsCount++;
      this.logger.debug(
        `Trigger ${triggerId} for method ${triggerMethod} in handler class ${handlerClass.name} registered`,
        {
          class: handlerClass.name,
          ...triggerRegistration,
        },
      );
    }
    this.logger.verbose(`${operationsCount} operation(s) for handler ${handlerClass.name} registered`);
  }

  private getOperationMetadata(
    handlerClass: TriggerHandlerClass,
    handlerMethod: string,
  ): EventHubTriggerMetadata | undefined {
    try {
      return this.metadataReader.getTriggerMetadata(handlerClass, handlerMethod);
    } catch (error) {
      // if Azure Function class is not EventHub Handler
      if (error instanceof TriggerHandlerMetadataError) {
        return undefined;
      }
      throw error;
    }
  }
}
