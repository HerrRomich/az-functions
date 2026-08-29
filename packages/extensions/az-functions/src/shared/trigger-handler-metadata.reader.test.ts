import { FUNCTION_HANDLER_METADATA } from './platform.model';
import { TriggerHandlerMetadataError, TriggerHandlerMetadataReader } from './trigger-handler-metadata.reader';

describe('Trigger handler metadata reader', () => {
  let metadataReader: TriggerHandlerMetadataReader;

  beforeEach(() => {
    metadataReader = new TriggerHandlerMetadataReader();
  });

  it('should throw an error if metadata is not found', () => {
    class TestTriggerHandler {}
    expect(() => metadataReader.getHandlerClassMetadata(TestTriggerHandler)).toThrowWithMessage(
      TriggerHandlerMetadataError,
      `No trigger handler metadata found for triggerHandlerClass=${TestTriggerHandler.name}`,
    );
  });

  it('should return metadata if found', () => {
    const metadata = { type: 'test' };
    class TestTriggerHandler {}
    Reflect.defineMetadata(FUNCTION_HANDLER_METADATA, metadata, TestTriggerHandler);
    const result = metadataReader.getHandlerClassMetadata(TestTriggerHandler);
    expect(result).toEqual(metadata);
  });
});
