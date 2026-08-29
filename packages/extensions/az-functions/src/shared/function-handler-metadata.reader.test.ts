import { FUNCTION_HANDLER_METADATA } from './platform.model';
import { TriggerHandlerMetadataError, TriggerHandlerMetadataReader } from './trigger-handler-metadata.reader';

describe('FunctionHandlerMetadataReader', () => {
  let subject: TriggerHandlerMetadataReader;

  beforeEach(() => {
    subject = new TriggerHandlerMetadataReader();
  });

  describe('getHandlerClassMetadata', () => {
    it('should throw if no metadata is found', () => {
      class NoMetadataClass {}

      expect(() => subject.getHandlerClassMetadata(NoMetadataClass)).toThrowWithMessage(
        TriggerHandlerMetadataError,
        `No trigger handler metadata found for triggerHandlerClass=${NoMetadataClass.name}`,
      );
    });

    it('should return metadata if it is found', () => {
      const expectedMetadata = {
        type: 'http-controller',
      };
      @Reflect.metadata(FUNCTION_HANDLER_METADATA, expectedMetadata)
      class WithMetadata {}

      const actualMetadata = subject.getHandlerClassMetadata(WithMetadata);

      expect(actualMetadata).toBe(expectedMetadata);
    });
  });
});
