import { decorate, injectable } from 'inversify';
import { adjustMetadata, AZURE_FUNCTION_METADATA_KEY, AzureFunctions, getCommonArg } from 'shared';
import {
  EventHubHandlerArgMetadata,
  EventHubHandlerConfig,
  EventHubHandlerMessageArgConfig,
  EventHubHandlerMetadata,
} from './decorators.model';

export const EVENT_HUB_HANDLE_METHOD_METADATA_KEY = Symbol.for('metadata:event-hub-handle-method-metadata');

export function eventHubHandler(config: EventHubHandlerConfig) {
  return function <T extends AzureFunctions>(target: T) {
    const metadata: EventHubHandlerMetadata = {
      type: 'event-hub-handler',
      ...config,
    };
    Reflect.defineMetadata(AZURE_FUNCTION_METADATA_KEY, metadata, target);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
    decorate(injectable(), target as Function);
  };
}

export function message(
  messageConfig: EventHubHandlerMessageArgConfig,
): (target: AzureFunctions, propertyKey: string | symbol, parameterIndex: number) => void {
  return adjustHandlerMetadata(convertEventHubConfigToMeta('message', messageConfig));
}

export function messages(
  messagesConfig: EventHubHandlerMessageArgConfig,
): (target: AzureFunctions, propertyKey: string | symbol, parameterIndex: number) => void {
  return adjustHandlerMetadata(convertEventHubConfigToMeta('messages', messagesConfig));
}

function convertEventHubConfigToMeta(
  type: EventHubHandlerArgMetadata['type'],
  messagesConfig: EventHubHandlerMessageArgConfig,
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
  return adjustMetadata(EVENT_HUB_HANDLE_METHOD_METADATA_KEY, handlerArg, getCommonArg);
}
