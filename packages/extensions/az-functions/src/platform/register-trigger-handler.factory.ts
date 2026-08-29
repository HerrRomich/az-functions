import { ResolutionContext } from 'inversify';
import { LOGGER_FACTORY } from 'logger';
import {
  serviceIdentifier,
  TRIGGER_HANDLER_REGISTRATION_SERVICE,
  TriggerHandlerClass,
  TriggerHandlerMetadataReader,
} from 'shared';

export const REGISTER_TRIGGER_HANDLER_FACTORY = serviceIdentifier<RegisterTriggerHandlerFactory>(
  'Register Trigger Handler Factory',
);

export type RegisterTriggerHandlerFactory = (triggerHandlerClass: TriggerHandlerClass) => void;

export function bindRegisterTriggerHandlerFactory(context: ResolutionContext): RegisterTriggerHandlerFactory {
  const loggerFactory = context.get(LOGGER_FACTORY);
  const logger = loggerFactory();
  const metadataService = context.get(TriggerHandlerMetadataReader);
  return (triggerHandlerClass: TriggerHandlerClass): void => {
    try {
      const metadata = metadataService.getHandlerClassMetadata(triggerHandlerClass);
      const { type } = metadata;
      const functionRegistrationService = context.get(TRIGGER_HANDLER_REGISTRATION_SERVICE, {
        name: type,
        optional: true,
      });
      if (functionRegistrationService === undefined) {
        logger.warn(` No registration service ${TRIGGER_HANDLER_REGISTRATION_SERVICE.toString()}`, {
          triggerHandlerClass: triggerHandlerClass.name,
          triggerType: type,
        });
      } else {
        functionRegistrationService.register(triggerHandlerClass);
      }
    } catch (error) {
      logger.error(`Failed registration of trigger handler ${triggerHandlerClass.name}`, {
        triggerHandlerClass: triggerHandlerClass.name,
        error,
      });
    }
  };
}
