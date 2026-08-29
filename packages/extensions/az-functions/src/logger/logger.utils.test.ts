import { HttpRequest, HttpResponse } from '@azure/functions';
import { PlatformContext, PlatformContextManager } from 'context';
import { mock, MockProxy } from 'jest-mock-extended';
import { AzFunctionsError } from 'shared';
import { z } from 'zod';
import { CONTEXT_LOGGER_METADATA } from './logger.model';
import { adjustContextLoggerMetadata, sanitizeMetadata, SanitizerOptions } from './logger.utils';

class TestClass {
  constructor(public optionalString?: string) {}
}

class TestErrorClass extends AzFunctionsError {
  constructor(message?: string, options?: any) {
    super(message, options);
  }
}

describe('Logger utils', () => {
  describe('sanitizeMetadata', () => {
    let metadata: unknown;

    beforeEach(() => {
      const deepDeepDeepNestedError = new TestErrorClass('Deep deep deep nested error', {
        details: {
          deepDeepDeepNestedStringProperty: 'deepDeepDeepNestedStringValue',
          deepDeepDeepNestedNumberProperty: 400,
          deepDeepDeepNestedBooleanProperty: true,
          ...Object.fromEntries(
            Array.from({ length: 30 }, (_, i) => [`deepDeepDeepNestedKey${i + 1}`, `deepDeepDeepNestedValue${i + 1}`]),
          ),
        },
      });
      deepDeepDeepNestedError.stack = [
        'Error: Deep deep deep nested error',
        ...Array.from({ length: 30 }, (_, i) => `line ${i + 1}`),
      ].join('\n');
      const deepDeepNestedError = new Error('Deep deep nested error', {
        cause: deepDeepDeepNestedError,
      });
      deepDeepNestedError.stack = undefined;
      const deepNestedError = new RangeError('Deep nested range error', {
        cause: deepDeepNestedError,
      });
      deepNestedError.stack = [
        'RangeError: Deep nested range error',
        ...Array.from({ length: 100 }, (_, i) => `line ${i + 1}`),
      ].join('\n');
      const nestedError = new Error('Test error', {
        cause: deepNestedError,
      });
      nestedError.stack = ['Error: Test error', ...Array.from({ length: 100 }, (_, i) => `line ${i + 1}`)].join('\n');
      const azFunctionsError = new TestErrorClass('Azure function error', {
        cause: nestedError,
        details: {
          stringProperty: 'stringValue',
          undefinedProperty: undefined,
          nullProperty: null,
          numberProperty: 42,
          booleanProperty: true,
          objectProperty: {
            nestedStringProperty: 'nestedStringValue',
            nestedNumberProperty: 100,
            nestedBooleanProperty: false,
          },
        },
      });
      azFunctionsError.stack = [
        'TestErrorClass: Azure function error',
        ...Array.from({ length: 100 }, (_, i) => `line ${i + 1}`),
      ].join('\n');
      const circularObject = {
        stringProperty: 'stringValue',
        numberProperty: 42,
        booleanProperty: true,
        objectProperty: {
          nestedStringProperty: 'nestedStringValue',
          nestedNumberProperty: 100,
          nestedBooleanProperty: false,
        },
        circularReference: null as unknown,
      };
      circularObject.circularReference = circularObject;
      metadata = {
        stringProperty: 'stringValue',
        longStrongProperty:
          'This is a very long string that exceeds the maximum length limit for sanitization purposes. It should be truncated to ensure that the metadata remains concise and manageable. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
        undefinedProperty: undefined,
        nullProperty: null,
        numberProperty: 42,
        booleanProperty: true,
        circularObjectProperty: circularObject,
        objectProperty: {
          nestedStringProperty: 'nestedStringValue',
          nestedNumberProperty: 100,
          nestedBooleanProperty: false,
          nestedLongObjectProperty: Object.fromEntries(
            Array.from({ length: 100 }, (_, i) => [`nestedKey${i + 1}`, `nestedValue${i + 1}`]),
          ),
          nestedArrayProperty: [4, 5, 6],
          nestedSetProperty: new Set([7, 8, 9]),
          nestedMapProperty: new Map([
            ['nestedKey1', 'nestedValue1'],
            ['nestedKey2', 'nestedValue2'],
          ]),
          nestedObjectProperty: {
            deepNestedStringProperty: 'deepNestedStringValue',
            deepNestedNumberProperty: 200,
            deepNestedBooleanProperty: true,
            deepNestedObjectProperty: {
              deepDeepNestedStringProperty: 'deepDeepNestedStringValue',
              deepDeepNestedNumberProperty: 300,
              deepDeepNestedBooleanProperty: false,
              deepDeepNestedObjectProperty: {
                deepDeepDeepNestedStringProperty: 'deepDeepDeepNestedStringValue',
                deepDeepDeepNestedNumberProperty: 400,
                deepDeepDeepNestedBooleanProperty: true,
              },
            },
          },
        },
        httpRequestWithLengthProp: new HttpRequest({
          method: 'POST',
          url: 'https://example.com/api/test',
          headers: {
            'content-type': 'application/json',
            'Authorization': 'Bearer token',
            'x-ms-request-id': '12345',
            'content-length': '256',
          },
          query: {
            param1: 'value1',
            param2: 'value2',
          },
          params: {
            id: '123',
            name: 'test',
          },
        }),
        httpRequestWithoutLengthProp: new HttpRequest({
          method: 'GET',
          url: 'https://example.com/api/test',
          headers: {
            'content-type': 'application/json',
            'Authorization': 'Bearer token',
            'x-ms-request-id': '12345',
          },
          query: {
            param1: 'value1',
            param2: 'value2',
          },
          params: {
            id: '123',
            name: 'test',
          },
        }),
        httpResponseWithLengthProp: new HttpResponse({
          status: 200,
          headers: {
            'Authorization': 'Bearer token',
            'x-ms-request-id': '12345',
            'content-type': 'application/json',
            'content-length': '256',
          },
        }),
        httpResponseWithoutLengthProp: new HttpResponse({
          status: 204,
          headers: {
            'Authorization': 'Bearer token',
            'x-ms-request-id': '12345',
            'content-type': 'application/json',
          },
        }),
        testClassProperty: new TestClass('testString'),
        testEmptyClassProperty: new TestClass(),
        arrayProperty: [1, 2, 3],
        emptyArrayProperty: [],
        emptyObjectProperty: {},
        emptySetProperty: new Set(),
        emptyMapProperty: new Map(),
        longArrayProperty: Array.from({ length: 100 }, (_, i) => i + 1),
        functionProperty: () => {
          return 'functionResult';
        },
        symbolProperty: Symbol.for('test-symbol'),
        dateProperty: new Date('2024-01-01T00:00:00Z'),
        mapProperty: new Map([
          ['key1', 'value1'],
          ['key2', 'value2'],
        ]),
        longMapProperty: new Map(Array.from({ length: 100 }, (_, i) => [`key${i + 1}`, `value${i + 1}`])),
        setProperty: new Set([1, 2, 3]),
        longSetProperty: new Set(Array.from({ length: 100 }, (_, i) => i + 1)),
        bigintProperty: BigInt('123456789012345678901234567890'),
        errorProperty: azFunctionsError,
        regexProperty: /test/i,
        zodSchemaProperty: z.object({
          stringProperty: z.string().min(2).max(10),
          numberProperty: z.number(),
          booleanProperty: z.boolean(),
          objectProperty: z.object({
            nestedStringProperty: z.string(),
            nestedNumberProperty: z.number(),
            nestedBooleanProperty: z.boolean(),
          }),
        }),
      };
    });

    it('should sanitize metadata correctly with default options', () => {
      const actual = sanitizeMetadata(metadata);

      expect(actual).toBeDefined();
    });

    it('should sanitize metadata with unlimited options correctly', () => {
      const customOptions: SanitizerOptions = {
        maxDepth: Number.MAX_VALUE,
        maxTraceLength: Number.MAX_VALUE,
        maxStringLength: Number.MAX_VALUE,
        maxArrayLength: Number.MAX_VALUE,
        maxKeysCount: Number.MAX_VALUE,
      };

      const actual = sanitizeMetadata(metadata, customOptions);

      expect(actual).toBeDefined();
    });

    it('should sanitize metadata with custom options correctly', () => {
      const customOptions: SanitizerOptions = {
        maxDepth: 2,
        maxTraceLength: 3,
        maxStringLength: 50,
        maxArrayLength: 10,
        maxKeysCount: 10,
      };

      const actual = sanitizeMetadata(metadata, customOptions);

      expect(actual).toBeDefined();
    });

    it('should sanitize metadata with circular references correctly', () => {
      const customOptions: SanitizerOptions = {
        maxDepth: 3,
        maxKeysCount: Number.MAX_VALUE,
      };

      const actual: any = sanitizeMetadata(metadata, customOptions);

      expect(actual.circularObjectProperty.circularReference).toBe('[Circular]');
    });

    it('should truncate function property', () => {
      const customOptions: SanitizerOptions = {
        maxDepth: 3,
        maxKeysCount: Number.MAX_VALUE,
      };

      const actual: any = sanitizeMetadata(metadata, customOptions);

      expect(actual.functionProperty).toBeUndefined();
    });

    it('should sanitize metadata with symbol property correctly', () => {
      const customOptions: SanitizerOptions = {
        maxDepth: 3,
        maxKeysCount: Number.MAX_VALUE,
      };

      const actual: any = sanitizeMetadata(metadata, customOptions);

      expect(actual.symbolProperty).toEqual('[Symbol(test-symbol)]');
    });

    it('should sanitize metadata with date property correctly', () => {
      const customOptions: SanitizerOptions = {
        maxDepth: 3,
        maxKeysCount: Number.MAX_VALUE,
      };

      const actual: any = sanitizeMetadata(metadata, customOptions);

      expect(actual.dateProperty).toEqual('2024-01-01T00:00:00.000Z');
    });

    it('should sanitize metadata with bigint property correctly', () => {
      const customOptions: SanitizerOptions = {
        maxDepth: 3,
        maxKeysCount: Number.MAX_VALUE,
      };

      const actual: any = sanitizeMetadata(metadata, customOptions);

      expect(actual.bigintProperty).toEqual('123456789012345678901234567890');
    });

    it('should sanitize metadata with regex property correctly', () => {
      const customOptions: SanitizerOptions = {
        maxDepth: 3,
        maxKeysCount: Number.MAX_VALUE,
      };

      const actual: any = sanitizeMetadata(metadata, customOptions);

      expect(actual.regexProperty).toEqual('/test/i');
    });

    it('should sanitize metadata with error truncated by depth correctly', () => {
      const customOptions: SanitizerOptions = {
        maxDepth: 3,
        maxTraceLength: 50,
        maxKeysCount: Number.MAX_VALUE,
      };

      const actual: any = sanitizeMetadata(metadata, customOptions);

      expect(actual.errorProperty).toEqual(
        expect.objectContaining({
          details: {
            booleanProperty: true,
            nullProperty: null,
            numberProperty: 42,
            objectProperty: '[Object]',
            stringProperty: 'stringValue',
          },
          message: 'Azure function error',
          name: 'TestErrorClass',
          stack: expect.stringMatching(/TestErrorClass: Azure function error.+more 51 lines$/s),
          cause: {
            cause: '[Error<RangeError>]',
            message: 'Test error',
            name: 'Error',
            stack: expect.stringMatching(/^Error: Test error.+more 51 lines$/s),
          },
        }),
      );
    });

    describe('sanitizeMetadata with map', () => {
      it('should sanitize metadata with empty map correctly', () => {
        const customOptions: SanitizerOptions = {
          maxDepth: 3,
          maxKeysCount: Number.MAX_VALUE,
        };

        const actual: any = sanitizeMetadata(metadata, customOptions);

        expect(actual.emptyMapProperty).toEqual('[empty map]');
      });

      it('should sanitize metadata with trancated by depth map correctly', () => {
        const customOptions: SanitizerOptions = {
          maxDepth: 1,
          maxKeysCount: Number.MAX_VALUE,
        };

        const actual: any = sanitizeMetadata(metadata, customOptions);

        expect(actual.mapProperty).toEqual('[Map<2>]');
      });

      it('should sanitize metadata with trancated by keys count map correctly', () => {
        const customOptions: SanitizerOptions = {
          maxDepth: 3,
          maxKeysCount: 50,
        };

        const actual: any = sanitizeMetadata(metadata, customOptions);

        expect(actual.longMapProperty.__meta__).toEqual({
          truncated: true,
          totalKeys: 100,
          omittedKeys: 50,
        });
      });
    });

    describe('sanitizeMetadata with set', () => {
      it('should sanitize metadata with empty set correctly', () => {
        const customOptions: SanitizerOptions = {
          maxDepth: 3,
          maxKeysCount: Number.MAX_VALUE,
        };

        const actual: any = sanitizeMetadata(metadata, customOptions);

        expect(actual.emptySetProperty).toEqual('[empty set]');
      });

      it('should sanitize metadata with trancated by depth set correctly', () => {
        const customOptions: SanitizerOptions = {
          maxDepth: 1,
          maxKeysCount: Number.MAX_VALUE,
        };

        const actual: any = sanitizeMetadata(metadata, customOptions);

        expect(actual.setProperty).toEqual('[Set<3>]');
      });

      it('should sanitize metadata with trancated by keys count set correctly', () => {
        const customOptions: SanitizerOptions = {
          maxDepth: 3,
          maxKeysCount: Number.MAX_VALUE,
          maxArrayLength: 50,
        };

        const actual: any = sanitizeMetadata(metadata, customOptions);

        expect(actual.longSetProperty.indexOf('... more 50 items')).toEqual(50);
      });
    });

    describe('sanitizeMetadata with anonymous object', () => {
      it('should sanitize metadata with empty object correctly', () => {
        const customOptions: SanitizerOptions = {
          maxDepth: 3,
          maxKeysCount: Number.MAX_VALUE,
        };

        const actual: any = sanitizeMetadata(metadata, customOptions);

        expect(actual.emptyObjectProperty).toEqual('[empty Object]');
      });

      it('should sanitize metadata with trancated by depth object correctly', () => {
        const customOptions: SanitizerOptions = {
          maxDepth: 1,
          maxKeysCount: Number.MAX_VALUE,
        };

        const actual: any = sanitizeMetadata(metadata, customOptions);

        expect(actual.objectProperty).toEqual('[Object]');
      });

      it('should sanitize metadata with trancated by keys count object correctly', () => {
        const customOptions: SanitizerOptions = {
          maxDepth: 3,
          maxKeysCount: 50,
        };

        const actual: any = sanitizeMetadata(metadata, customOptions);

        expect(actual.objectProperty.nestedLongObjectProperty.__meta__).toEqual({
          truncated: true,
          totalKeys: 100,
          omittedKeys: 50,
        });
      });
    });

    describe('sanitizeMetadata with test class', () => {
      it('should sanitize metadata with test class correctly', () => {
        const customOptions: SanitizerOptions = {
          maxDepth: 3,
          maxKeysCount: Number.MAX_VALUE,
        };

        const actual: any = sanitizeMetadata(metadata, customOptions);

        expect(actual.testClassProperty).toEqual({
          optionalString: 'testString',
        });
      });

      it('should sanitize metadata with empty test class correctly', () => {
        const customOptions: SanitizerOptions = {
          maxDepth: 1,
          maxKeysCount: Number.MAX_VALUE,
        };

        const actual: any = sanitizeMetadata(metadata, customOptions);

        expect(actual.testEmptyClassProperty).toEqual('[TestClass]');
      });
    });

    describe('sanitizeMetadata with array', () => {
      it('should sanitize metadata with trancated by depth array correctly', () => {
        const customOptions: SanitizerOptions = {
          maxDepth: 1,
          maxKeysCount: Number.MAX_VALUE,
        };

        const actual: any = sanitizeMetadata(metadata, customOptions);

        expect(actual.arrayProperty).toEqual('[Array<3>]');
      });

      it('should sanitize metadata with trancated by keys count array correctly', () => {
        const customOptions: SanitizerOptions = {
          maxDepth: 3,
          maxKeysCount: Number.MAX_VALUE,
          maxArrayLength: 50,
        };

        const actual: any = sanitizeMetadata(metadata, customOptions);

        expect(actual.longArrayProperty.indexOf('... more 50 items')).toEqual(50);
      });

      it('should sanitize metadata with empty array correctly', () => {
        const customOptions: SanitizerOptions = {
          maxDepth: 3,
          maxKeysCount: Number.MAX_VALUE,
        };

        const actual: any = sanitizeMetadata(metadata, customOptions);

        expect(actual.emptyArrayProperty).toEqual('[empty Array]');
      });
    });

    describe('sanitizeMetadata with zod schema', () => {
      it('should sanitize metadata with zod schema correctly', () => {
        const customOptions: SanitizerOptions = {
          maxDepth: Number.MAX_VALUE,
          maxKeysCount: Number.MAX_VALUE,
        };

        const actual: any = sanitizeMetadata(metadata, customOptions);

        expect(actual.zodSchemaProperty).toEqual({
          type: 'object',
          shape: {
            stringProperty: {
              checks: [
                {
                  check: 'min_length',
                  minimum: 2,
                },
                {
                  check: 'max_length',
                  maximum: 10,
                },
              ],
              type: 'string',
            },
            booleanProperty: {
              type: 'boolean',
            },
            numberProperty: {
              checks: '[empty Array]',
              type: 'number',
            },
            objectProperty: {
              shape: {
                nestedStringProperty: {
                  type: 'string',
                },
                nestedBooleanProperty: {
                  type: 'boolean',
                },
                nestedNumberProperty: {
                  checks: '[empty Array]',
                  type: 'number',
                },
              },
              type: 'object',
            },
          },
        });
      });

      it('should sanitize metadata with zod schema truncated by depth correctly', () => {
        const customOptions: SanitizerOptions = {
          maxDepth: 4,
          maxKeysCount: Number.MAX_VALUE,
        };

        const actual: any = sanitizeMetadata(metadata, customOptions);

        expect(actual.zodSchemaProperty).toEqual({
          type: 'object',
          shape: {
            stringProperty: '[Object]',
            booleanProperty: '[Object]',
            numberProperty: '[Object]',
            objectProperty: '[Object]',
          },
        });
      });
    });
  });

  describe('adjustContextLoggerMetadata', () => {
    let mockContextManager: MockProxy<PlatformContextManager>;
    let mockContext: MockProxy<PlatformContext>;

    beforeEach(() => {
      mockContext = mock<PlatformContext>();
      mockContextManager = mock<PlatformContextManager>({
        active: () => mockContext,
      });
    });

    it('should adjust invocationContext logger metadata if it exists', () => {
      mockContext.getValue.calledWith(CONTEXT_LOGGER_METADATA).mockReturnValue({
        info: {
          infoMeta: 'info-meta',
        },
        trace: {
          traceMeta: 'trace-meta',
        },
      });

      adjustContextLoggerMetadata(mockContextManager, {
        info: {
          infoExtra: 'info-extra',
        },
        http: {
          httpMeta: 'http-meta',
        },
      });

      expect(mockContext.setValue).toHaveBeenCalledWith(CONTEXT_LOGGER_METADATA, {
        info: {
          infoMeta: 'info-meta',
          infoExtra: 'info-extra',
        },
        trace: {
          traceMeta: 'trace-meta',
        },
        http: {
          httpMeta: 'http-meta',
        },
      });
    });

    it('should adjust invocationContext logger metadata if it does not exist', () => {
      mockContext.getValue.calledWith(CONTEXT_LOGGER_METADATA).mockReturnValue(undefined);

      adjustContextLoggerMetadata(mockContextManager, {
        info: {
          infoExtra: 'info-extra',
        },
        http: {
          httpMeta: 'http-meta',
        },
      });

      expect(mockContext.setValue).toHaveBeenCalledWith(CONTEXT_LOGGER_METADATA, {
        info: {
          infoExtra: 'info-extra',
        },
        http: {
          httpMeta: 'http-meta',
        },
      });
    });

    it('should not adjust invocationContext logger metadata if there is no active context', () => {
      (mockContextManager.active as unknown) = () => undefined;

      adjustContextLoggerMetadata(mockContextManager, {
        info: {
          infoExtra: 'info-extra',
        },
        http: {
          httpMeta: 'http-meta',
        },
      });
    });
  });
});
