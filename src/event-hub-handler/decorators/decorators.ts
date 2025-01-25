import { decorate, injectable } from 'inversify';
import { adjustMetadata, AZURE_FUNCTION_METADATA_KEY, AzureFunctions, getCommonArg, initializeMetadata } from 'shared';
import {
  EventHubConfig,
  EventHubHandlerArgMetadata,
  EventHubHandlerArgsMetadata,
  EventHubHandlerConfig,
  EventHubHandlerMessageArgConfig,
  EventHubHandlerMetadata,
  EventHubHandlersMetadata,
} from './decorators.model';

export const EVENT_HUB_HANDLER_METADATA_KEY = Symbol.for('metadata:event-hub-handler');

export function EventHubHandlers(config: EventHubConfig) {
  return function <T extends AzureFunctions>(target: T) {
    const metadata: EventHubHandlersMetadata = {
      type: 'event-hub-handlers',
      ...config,
    };
    Reflect.defineMetadata(AZURE_FUNCTION_METADATA_KEY, metadata, target);
    decorate(injectable(), target);
  };
}

export function Handler(handlerConfig?: EventHubHandlerConfig) {
  return function (target: AzureFunctions, propertyKey: string | symbol) {
    const argsMetadata = (Reflect.getOwnMetadata(EVENT_HUB_HANDLER_METADATA_KEY, target, propertyKey) ??
      initializeMetadata(target, propertyKey, getCommonArg)) as EventHubHandlerArgsMetadata;
    const metadata: EventHubHandlerMetadata = {
      ...handlerConfig,
      ...argsMetadata,
    };
    Reflect.defineMetadata(EVENT_HUB_HANDLER_METADATA_KEY, metadata, target, propertyKey);
  };
}

export function Message(
  messageConfig: EventHubHandlerMessageArgConfig
): (target: AzureFunctions, propertyKey: string | symbol, parameterIndex: number) => void {
  return adjustHandlerMetadata(convertEventHubConfigToMeta('message', messageConfig));
}

export function Messages(
  messagesConfig: EventHubHandlerMessageArgConfig
): (target: AzureFunctions, propertyKey: string | symbol, parameterIndex: number) => void {
  return adjustHandlerMetadata(convertEventHubConfigToMeta('messages', messagesConfig));
}

function convertEventHubConfigToMeta(
  type: EventHubHandlerArgMetadata['type'],
  messagesConfig: EventHubHandlerMessageArgConfig
): EventHubHandlerArgMetadata {
  return {
    type,
    payloadSchema: messagesConfig.withPayload,
    systemPropertiesSchema: messagesConfig.withSystemProperties,
    propertiesSchema: messagesConfig.withProperties,
    isEventData: messagesConfig.withEventData,
  };
}

function adjustHandlerMetadata(handlerArg: EventHubHandlerArgMetadata) {
  return adjustMetadata(EVENT_HUB_HANDLER_METADATA_KEY, handlerArg, getCommonArg);
}
