import { InvocationContext } from '@azure/functions';
import { mock } from 'jest-mock-extended';
import { AZURE_FUNCTION_METADATA_KEY, context, getCommonArg, initializeMetadata, PlatformError } from '..';

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
    it('should throw startPlatform error if method is unknown', () => {
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
        class InvalidUsage {
          constructor(@context() _ctx: InvocationContext) {
            /* empty */
          }
        }

        return new InvalidUsage(mock<InvocationContext>());
      }).toThrowWithMessage(PlatformError, 'The decorator can only be used on method parameters.');
    });
  });
});
