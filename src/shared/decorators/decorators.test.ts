import { InvocationContext } from '@azure/functions';
import { AZURE_FUNCTION_METADATA_KEY, PlatformError } from 'shared';
import { Context, getCommonArg, initializeMetadata } from './decorators';

class TestClass {
  get(@Context() context: InvocationContext, test: string) {
    context.log(test);
  }
}

describe('decorators', () => {
  let subject: TestClass;

  beforeEach(() => {
    subject = new TestClass();
  });

  describe('initializeMetadata', () => {
    it('should throw platform error if method is unknown', () => {
      const subject = new TestClass();

      expect(() => initializeMetadata(subject, 'unknownMethod', getCommonArg)).toThrowWithMessage(
        PlatformError,
        "Method TestClass.unknownMethod doesn't exist or has no metadata. Be sure to import reflect-metadata."
      );
    });
  });

  describe('Context', () => {
    it('should provide operation with metadata', () => {
      expect(Reflect.getMetadata(AZURE_FUNCTION_METADATA_KEY, subject, 'get')).toEqual({
        args: [
          {
            type: 'context',
          },
          {
            type: 'undefined',
          },
        ],
      });
    });
  });
});
