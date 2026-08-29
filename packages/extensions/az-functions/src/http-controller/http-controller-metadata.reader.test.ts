import { mock, MockProxy } from 'jest-mock-extended';
import { FUNCTION_HANDLER_METADATA, TriggerHandlerMetadataError, TriggerHandlerMetadataReader } from 'shared';
import { HttpControllerMetadataReader } from './http-controller-metadata.reader';

describe('HttpControllerMetadataReader', () => {
  let mockMetadataReader: MockProxy<TriggerHandlerMetadataReader>;

  let subject: HttpControllerMetadataReader;

  beforeEach(() => {
    mockMetadataReader = mock<TriggerHandlerMetadataReader>();

    subject = new HttpControllerMetadataReader(mockMetadataReader);
  });

  describe('getHandlerClassMetadata', () => {
    it('should return the handler class metadata when type is http-controller', () => {
      const mockHandlerClass = class TestController {};
      const mockMetadata = { type: 'http-controller', name: 'TestController' };

      mockMetadataReader.getHandlerClassMetadata.calledWith(mockHandlerClass).mockReturnValue(mockMetadata);

      const result = subject.getHandlerClassMetadata(mockHandlerClass);

      expect(result).toEqual(mockMetadata);
    });

    it('should throw an error when type is not http-controller', () => {
      const testHandlerClass = class TestController {};
      const mockMetadata = { type: 'not-http-controller', name: 'TestController' };

      mockMetadataReader.getHandlerClassMetadata.calledWith(testHandlerClass).mockReturnValue(mockMetadata);

      expect(() => subject.getHandlerClassMetadata(testHandlerClass)).toThrowWithMessage(
        TriggerHandlerMetadataError,
        `Invalid type for handler class ${testHandlerClass.name}. Expected '${'http-controller'}', but got '${mockMetadata.type}'.`,
      );
    });
  });

  describe('getOperationMetadata', () => {
    class TestController {}
    const testOperation = 'testOperation';

    it('should return the operation metadata when metadata exists', () => {
      jest.spyOn(Reflect, 'getOwnMetadata').mockReturnValue({ type: 'http-controller', path: '/test', method: 'get' });

      const result = subject.getOperationMetadata(TestController, testOperation);

      expect(result).toEqual({ type: 'http-controller', path: '/test', method: 'get' });
      expect(Reflect.getOwnMetadata).toHaveBeenCalledWith(
        FUNCTION_HANDLER_METADATA,
        TestController.prototype,
        testOperation,
      );
    });

    it('should throw an error when type is not http-controller', () => {
      jest
        .spyOn(Reflect, 'getOwnMetadata')
        .mockReturnValue({ type: 'not-http-controller', path: '/test', method: 'get' });

      expect(() => subject.getOperationMetadata(TestController, testOperation)).toThrowWithMessage(
        TriggerHandlerMetadataError,
        `Invalid type for operation ${testOperation} in handler class ${TestController.name}. Expected '${'http-controller'}', but got '${'not-http-controller'}'.`,
      );
      expect(Reflect.getOwnMetadata).toHaveBeenCalledWith(
        FUNCTION_HANDLER_METADATA,
        TestController.prototype,
        testOperation,
      );
    });

    it('should throw an error when metadata does not exist', () => {
      jest.spyOn(Reflect, 'getOwnMetadata').mockReturnValue(undefined);

      expect(() => subject.getOperationMetadata(TestController, testOperation)).toThrowWithMessage(
        TriggerHandlerMetadataError,
        `No metadata found for operation ${testOperation} in handler class ${TestController.name}.`,
      );
      expect(Reflect.getOwnMetadata).toHaveBeenCalledWith(
        FUNCTION_HANDLER_METADATA,
        TestController.prototype,
        testOperation,
      );
    });
  });
});
