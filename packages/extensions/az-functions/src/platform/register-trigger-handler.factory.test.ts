import { Container } from 'inversify';
import { mock, MockProxy } from 'jest-mock-extended';
import { Logger, LOGGER_FACTORY } from 'logger';
import {
  TRIGGER_HANDLER_REGISTRATION_SERVICE,
  TriggerHandlerMetadataReader,
  TriggerHandlerRegistrationService,
} from 'shared';
import {
  bindRegisterTriggerHandlerFactory,
  REGISTER_TRIGGER_HANDLER_FACTORY,
  RegisterTriggerHandlerFactory,
} from './register-trigger-handler.factory';

describe('registerTriggerHandlerFactory', () => {
  class TriggerHandlerClass {}

  let container: Container;
  let subject: RegisterTriggerHandlerFactory;

  let mockLogger: MockProxy<Logger>;
  let mockMetadataService: MockProxy<TriggerHandlerMetadataReader>;
  let mockRegistrationService1: MockProxy<TriggerHandlerRegistrationService>;
  let mockRegistrationService2: MockProxy<TriggerHandlerRegistrationService>;

  beforeEach(() => {
    container = new Container();
    container.bind(REGISTER_TRIGGER_HANDLER_FACTORY).toFactory(bindRegisterTriggerHandlerFactory);

    mockLogger = mock<Logger>();
    container.bind(LOGGER_FACTORY).toFactory(() => () => mockLogger);
    mockMetadataService = mock<TriggerHandlerMetadataReader>();
    container.bind(TriggerHandlerMetadataReader).toConstantValue(mockMetadataService);

    mockRegistrationService1 = mock<TriggerHandlerRegistrationService>();
    container.bind(TRIGGER_HANDLER_REGISTRATION_SERVICE).toConstantValue(mockRegistrationService1).whenNamed('type1');
    mockRegistrationService2 = mock<TriggerHandlerRegistrationService>();
    container.bind(TRIGGER_HANDLER_REGISTRATION_SERVICE).toConstantValue(mockRegistrationService2).whenNamed('type2');

    subject = container.get(REGISTER_TRIGGER_HANDLER_FACTORY);
  });

  it('should register trigger handler if registration service is known for type1', () => {
    const metadata = { type: 'type1' };
    mockMetadataService.getHandlerClassMetadata.calledWith(TriggerHandlerClass).mockReturnValue(metadata);

    subject(TriggerHandlerClass);

    expect(mockMetadataService.getHandlerClassMetadata).toHaveBeenCalledWith(TriggerHandlerClass);
    expect(mockRegistrationService1.register).toHaveBeenCalledWith(TriggerHandlerClass);
    expect(mockRegistrationService2.register).not.toHaveBeenCalled();
  });

  it('should register trigger handler if registration service is known for type2', () => {
    const metadata = { type: 'type2' };
    mockMetadataService.getHandlerClassMetadata.calledWith(TriggerHandlerClass).mockReturnValue(metadata);

    subject(TriggerHandlerClass);

    expect(mockMetadataService.getHandlerClassMetadata).toHaveBeenCalledWith(TriggerHandlerClass);
    expect(mockRegistrationService1.register).not.toHaveBeenCalled();
    expect(mockRegistrationService2.register).toHaveBeenCalledWith(TriggerHandlerClass);
  });

  it('should log a warning if no registration service is found for the type', () => {
    const metadata = { type: 'unknownType' };
    mockMetadataService.getHandlerClassMetadata.calledWith(TriggerHandlerClass).mockReturnValue(metadata);

    subject(TriggerHandlerClass);

    expect(mockMetadataService.getHandlerClassMetadata).toHaveBeenCalledWith(TriggerHandlerClass);
    expect(mockRegistrationService1.register).not.toHaveBeenCalled();
    expect(mockRegistrationService2.register).not.toHaveBeenCalled();
  });

  it('should log an error if an error is thrown while getting metadata', () => {
    const error = new Error('metadata error');
    mockMetadataService.getHandlerClassMetadata.calledWith(TriggerHandlerClass).mockImplementation(() => {
      throw error;
    });

    subject(TriggerHandlerClass);

    expect(mockMetadataService.getHandlerClassMetadata).toHaveBeenCalledWith(TriggerHandlerClass);
    expect(mockRegistrationService1.register).not.toHaveBeenCalled();
    expect(mockRegistrationService2.register).not.toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith(
      `Failed registration of trigger handler ${TriggerHandlerClass.name}`,
      {
        triggerHandlerClass: TriggerHandlerClass.name,
        error,
      },
    );
  });

  it('should log an error if an error is thrown while registering the trigger handler', () => {
    const metadata = { type: 'type1' };
    const error = new Error('registration error');
    mockMetadataService.getHandlerClassMetadata.calledWith(TriggerHandlerClass).mockReturnValue(metadata);
    mockRegistrationService1.register.calledWith(TriggerHandlerClass).mockImplementation(() => {
      throw error;
    });

    subject(TriggerHandlerClass);

    expect(mockMetadataService.getHandlerClassMetadata).toHaveBeenCalledWith(TriggerHandlerClass);
    expect(mockRegistrationService1.register).toHaveBeenCalledWith(TriggerHandlerClass);
    expect(mockRegistrationService2.register).not.toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith(
      `Failed registration of trigger handler ${TriggerHandlerClass.name}`,
      {
        triggerHandlerClass: TriggerHandlerClass.name,
        error,
      },
    );
  });
});
