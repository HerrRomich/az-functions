import { InvocationContext } from '@azure/functions';
import { mock } from 'jest-mock-extended';
import {
  AzFunctionsDecoratorError,
  FUNCTION_HANDLER_METADATA,
  getCommonArg,
  initializeMetadata,
  InvocationCtx,
} from '..';

class TestClass {
  get(@InvocationCtx() context: InvocationContext, test: string) {
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
        AzFunctionsDecoratorError,
        "Method TestClass.unknownMethod doesn't exist or has no metadata. Be sure to import reflect-metadata.",
      );
    });
  });

  describe('InvocationCtx', () => {
    it('should provide controllerMethod with metadata', () => {
      expect(Reflect.getMetadata(FUNCTION_HANDLER_METADATA, subject, 'get')).toEqual({
        args: [
          {
            type: 'invocationContext',
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
          constructor(@InvocationCtx() _ctx: InvocationContext) {
            /* empty */
          }
        }

        return new InvalidUsage(mock<InvocationContext>());
      }).toThrowWithMessage(AzFunctionsDecoratorError, 'The decorator can only be used on method parameters.');
    });
  });
});
