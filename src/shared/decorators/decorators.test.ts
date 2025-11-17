import { InvocationContext } from '@azure/functions';
import { AZURE_FUNCTION_METADATA_KEY, context, getCommonArg, initializeMetadata, PlatformError } from 'shared';

class TestClass {
  get(@context() context: InvocationContext, test: string) {
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
      expect(() => initializeMetadata(subject, 'unknownMethod', getCommonArg)).toThrowWithMessage(
        PlatformError,
        "Method TestClass.unknownMethod doesn't exist or has no metadata. Be sure to import reflect-metadata.",
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

    it('should not be used on non-method parameter', () => {
      expect(() => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        class InvalidUsage {
          // eslint-disable-next-line @typescript-eslint/no-empty-function,@typescript-eslint/no-unused-vars
          constructor(@context() ctx: InvocationContext) {}
        }
      }).toThrowWithMessage(PlatformError, 'The decorator can only be used on method parameters.');
    });
  });
});
