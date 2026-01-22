import { mock, MockProxy } from 'jest-mock-extended';
import { FUNCTION_HANDLER_METADATA, TriggerHandlerMetadataError, TriggerHandlerMetadataReader } from 'shared';
import { EVENT_HUB_HANDLER_TYPE } from './decorators/index';
import { EventHubHandlerMetadataReader } from './event-hub-handler-metadata.reader';

describe('EventHubHandlerMetadataReader', () => {
  let mockMetadataReader: MockProxy<TriggerHandlerMetadataReader>;

  let subject: EventHubHandlerMetadataReader;

  beforeEach(() => {
    mockMetadataReader = mock<TriggerHandlerMetadataReader>();

    subject = new EventHubHandlerMetadataReader(mockMetadataReader);
  });

  describe('getHandlerClassMetadata', () => {
    it('should return the handler class metadata when type is event-hub-handler', () => {
      const mockHandlerClass = class TestController {};
      const mockMetadata = { type: 'event-hub-handler', name: 'TestController' };

      mockMetadataReader.getHandlerClassMetadata.calledWith(mockHandlerClass).mockReturnValue(mockMetadata);

      const result = subject.getHandlerClassMetadata(mockHandlerClass);

      expect(result).toEqual(mockMetadata);
    });

    it('should throw an error when type is not event-hub-handler', () => {
      const testHandlerClass = class TestController {};
      const mockMetadata = { type: 'not-event-hub-handler', name: 'TestController' };

      mockMetadataReader.getHandlerClassMetadata.calledWith(testHandlerClass).mockReturnValue(mockMetadata);

      expect(() => subject.getHandlerClassMetadata(testHandlerClass)).toThrowWithMessage(
        TriggerHandlerMetadataError,
        `Invalid type for handler class ${testHandlerClass.name}. Expected '${EVENT_HUB_HANDLER_TYPE}', but got '${mockMetadata.type}'.`,
      );
    });
  });

  describe('getTriggerMetadata', () => {
    class TestController {}
    const testTrigger = 'test-trigger';

    it('should return the trigger metadata when metadata exists', () => {
      jest
        .spyOn(Reflect, 'getOwnMetadata')
        .mockReturnValue({ type: 'event-hub-handler', path: '/test', method: 'get' });

      const result = subject.getTriggerMetadata(TestController, testTrigger);

      expect(result).toEqual({ type: 'event-hub-handler', path: '/test', method: 'get' });
      expect(Reflect.getOwnMetadata).toHaveBeenCalledWith(
        FUNCTION_HANDLER_METADATA,
        TestController.prototype,
        testTrigger,
      );
    });

    it('should throw an error when metadata type is not event-hub-handler', () => {
      jest.spyOn(Reflect, 'getOwnMetadata').mockReturnValue({ type: 'not-event-hub-handler' });

      expect(() => subject.getTriggerMetadata(TestController, testTrigger)).toThrowWithMessage(
        TriggerHandlerMetadataError,
        `Invalid type for operation ${testTrigger} in handler class ${TestController.name}. Expected '${EVENT_HUB_HANDLER_TYPE}', but got 'not-event-hub-handler'.`,
      );
      expect(Reflect.getOwnMetadata).toHaveBeenCalledWith(
        FUNCTION_HANDLER_METADATA,
        TestController.prototype,
        testTrigger,
      );
    });

    it('should throw an error when metadata does not exist', () => {
      jest.spyOn(Reflect, 'getOwnMetadata').mockReturnValue(undefined);

      expect(() => subject.getTriggerMetadata(TestController, testTrigger)).toThrowWithMessage(
        TriggerHandlerMetadataError,
        `No metadata found for operation ${testTrigger} in handler class ${TestController.name}.`,
      );
      expect(Reflect.getOwnMetadata).toHaveBeenCalledWith(
        FUNCTION_HANDLER_METADATA,
        TestController.prototype,
        testTrigger,
      );
    });
  });
});
