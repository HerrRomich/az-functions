import { HttpRequest, InvocationContext } from '@azure/functions';
import { DeepMockProxy, mock, mockDeep, MockProxy } from 'jest-mock-extended';
import { UserAccount } from 'shared';
import { Writable } from 'type-fest';
import { z } from 'zod';
import { AzureHttpTriggerService } from './azure-http-trigger.service';
import { ControllerOperationMetadata } from './decorators';
import { AsyncHttpRequestArgsProvider } from './http-controller-platform.model';
import { BadRequestError } from './http-controller.model';

describe('AzureHttpTriggerService', () => {
  let mockContext: MockProxy<InvocationContext>;

  let subject: AzureHttpTriggerService;

  beforeEach(() => {
    mockContext = mock();

    subject = new AzureHttpTriggerService();
  });

  describe('handleHttpRequest', () => {
    const testOperationMetadata = {
      response: {
        status: 200,
        description: 'Test description',
        contentSchema: z.object({ testProp: z.string() }),
      },
    } as unknown as ControllerOperationMetadata;

    it('should handle request with direct response', async () => {
      const method = jest.fn();
      method.mockResolvedValue({
        testProp: 'test-value',
      });
      const result = await subject.handleHttpRequest(mockContext, testOperationMetadata, method);

      expect(result).toEqual({
        status: 200,
        jsonBody: {
          testProp: 'test-value',
        },
      });
      expect(method).toHaveBeenCalled();
    });

    it('should handle request with direct response without content schema', async () => {
      const method = jest.fn();
      method.mockResolvedValue('test-value');
      const result = await subject.handleHttpRequest(
        mockContext,
        {
          response: {
            status: 200,
            description: 'Test description',
          },
        } as unknown as ControllerOperationMetadata,
        method,
      );

      expect(result).toEqual({
        status: 200,
        jsonBody: 'test-value',
      });
      expect(method).toHaveBeenCalled();
    });

    it('should handle request with direct response without status as 200', async () => {
      const method = jest.fn();
      method.mockResolvedValue({
        testProp: 'test-value',
      });
      const result = await subject.handleHttpRequest(
        mockContext,
        {
          response: {
            description: 'Test description',
            contentSchema: z.object({ testProp: z.string() }),
          },
        } as unknown as ControllerOperationMetadata,
        method,
      );
      expect(result).toEqual({
        status: 200,
        jsonBody: {
          testProp: 'test-value',
        },
      });
      expect(method).toHaveBeenCalled();
    });

    it('should handle request with direct response without response definition', async () => {
      const method = jest.fn();
      method.mockResolvedValue('test-value');
      const result = await subject.handleHttpRequest(mockContext, {} as unknown as ControllerOperationMetadata, method);

      expect(result).toEqual('test-value');
      expect(method).toHaveBeenCalled();
    });

    it('should handle request with indirect response', async () => {
      const method = jest.fn();
      method.mockResolvedValue({
        status: 200,
        jsonBody: {
          testProp: 'test-value',
        },
      });
      const result = await subject.handleHttpRequest(mockContext, {} as unknown as ControllerOperationMetadata, method);

      expect(result).toEqual({
        status: 200,
        jsonBody: {
          testProp: 'test-value',
        },
      });

      expect(method).toHaveBeenCalled();
    });

    it('should return internal error if method returns not parsable response.', async () => {
      const method = jest.fn();
      method.mockResolvedValue({
        wrongProp: 12,
      });
      const result = await subject.handleHttpRequest(mockContext, testOperationMetadata, method);

      expect(result).toEqual({
        status: 500,
        body: 'Internal error is thrown during request.',
      });
      expect(method).toHaveBeenCalled();
      expect(mockContext.error).toHaveBeenCalledWith(expect.toStartWith('Response validation error.'));
    });

    it('should return internal error if method throws unknown error.', async () => {
      const method = jest.fn();
      method.mockRejectedValue(new Error('Unknown error.'));
      const result = await subject.handleHttpRequest(mockContext, testOperationMetadata, method);

      expect(result).toEqual({
        status: 500,
        body: 'Internal error is thrown during request.',
      });
      expect(method).toHaveBeenCalled();
      expect(mockContext.error).toHaveBeenCalledWith(expect.toStartWith('Error: Unknown error.'));
    });

    it('should return internal error if method throws not an error.', async () => {
      const method = jest.fn();
      method.mockRejectedValue('Unknown error.');

      const result = await subject.handleHttpRequest(mockContext, testOperationMetadata, method);

      expect(result).toEqual({
        status: 500,
        body: 'Internal error is thrown during request.',
      });
      expect(method).toHaveBeenCalled();
      expect(mockContext.error).toHaveBeenCalledWith(expect.toStartWith('Internal error: Unknown error.'));
    });

    it('should return client error if method throws http trigger error.', async () => {
      const method = jest.fn();
      method.mockRejectedValue(new BadRequestError('Parameter is incorrect.'));
      const result = await subject.handleHttpRequest(mockContext, testOperationMetadata, method);

      expect(result).toEqual({
        status: 400,
        body: 'Parameter is incorrect.',
      });
      expect(method).toHaveBeenCalled();
      expect(mockContext.error).toHaveBeenCalledWith(expect.toStartWith('BadRequestError: Parameter is incorrect.'));
    });
  });

  describe('buildArgProviders', () => {
    const testUserAccount = {} as UserAccount;

    let mockRequest: DeepMockProxy<Writable<HttpRequest>>;

    beforeEach(() => {
      mockRequest = mockDeep<Writable<HttpRequest>>();
      mockRequest.url =
        'http://test-server.test/api/test/12?text-query-single=query-item&text-query-multi=query-item1&text-query-multi=query-item2&number-query-single=3951&number-query-multi=146&number-query-multi=553&boolean-query1=true&boolean-query2=false&mixed-query=4682&mixed-query=mixed-value';
      mockRequest.params = {
        'path-item1': '12',
        'path-item2': 'text',
      };
      mockRequest.headers.get.mockImplementation(name => {
        switch (name) {
          case 'header-item1':
            return '12';
          case 'header-item2':
            return 'text';
          default:
            return null;
        }
      });
    });

    it('should return parsed args in case of no parsing errors', async () => {
      const argsProvider = subject.buildArgProviders({
        method: 'put',
        args: [
          {
            type: 'request',
          },
          {
            type: 'context',
          },
          {
            type: 'user',
          },
          {
            type: 'body',
            schema: z.object({
              items: z
                .object({
                  text: z.string(),
                  number: z.number().optional(),
                })
                .array(),
            }),
          },
          {
            type: 'path',
            name: 'path-item1',
            schema: z.number(),
          },
          {
            type: 'query',
            name: 'boolean-query1',
            schema: z.boolean(),
          },
          {
            type: 'query',
            name: 'number-query-multi',
            schema: z.number().array(),
          },
          {
            type: 'header',
            name: 'header-item1',
          },
        ],
      });
      const testBody = {
        items: [
          {
            text: 'text1',
            number: 123,
          },
          {
            text: 'text2',
          },
        ],
      };
      mockRequest.json.mockResolvedValue(testBody);

      const args = await argsProvider(mockRequest, mockContext, testUserAccount);

      expect(args).toHaveLength(8);
      expect(args[0]).toBe(mockRequest);
      expect(args[1]).toBe(mockContext);
      expect(args[2]).toBe(testUserAccount);
      expect(args[3]).toEqual(testBody);
      expect(args[4]).toEqual(12);
      expect(args[5]).toEqual(true);
      expect(args[6]).toEqual([146, 553]);
      expect(args[7]).toEqual('12');
    });

    it('should fail in case of multiple parsing errors', async () => {
      const argsProvider = subject.buildArgProviders({
        method: 'put',
        args: [
          {
            type: 'request',
          },
          {
            type: 'context',
          },
          {
            type: 'user',
          },
          {
            type: 'body',
            schema: z.object({
              items: z
                .object({
                  text: z.string(),
                  number: z.number().optional(),
                })
                .array(),
            }),
          },
          {
            type: 'path',
            name: 'path-item1',
            schema: z.number().min(25),
          },
          {
            type: 'query',
            name: 'boolean-query1',
            schema: z.boolean(),
          },
          {
            type: 'query',
            name: 'number-query-multi',
            schema: z.number().array(),
          },
          {
            type: 'header',
            name: 'header-item1',
            schema: z.string().min(20),
          },
        ],
      });
      const testBody = {
        items: [
          {
            text: 'text1',
            number: false,
          },
          {
            test: 'text2',
          },
        ],
      };
      mockRequest.json.mockResolvedValue(testBody);

      await expect(argsProvider(mockRequest, mockContext, testUserAccount)).rejects.toThrowWithMessage(
        BadRequestError,
        /Error parsing request body:[\s\S]*Error parsing path parameter=path-item1:[\s\S]*Error parsing header item=header-item1:/,
      );
    });

    describe('undefined', () => {
      it('should provide undefined', async () => {
        const argsProvider = subject.buildArgProviders({
          method: 'get',
          args: [
            {
              type: 'undefined',
            },
          ],
        });
        const args = await argsProvider(mockRequest, mockContext, testUserAccount);

        expect(args[0]).toBeUndefined();
      });
    });

    describe('request', () => {
      it('should provide request', async () => {
        const argsProvider = subject.buildArgProviders({
          method: 'get',
          args: [
            {
              type: 'request',
            },
          ],
        });
        const args = await argsProvider(mockRequest, mockContext, testUserAccount);

        expect(args[0]).toBe(mockRequest);
      });
    });

    describe('context', () => {
      it('should provide context', async () => {
        const argsProvider = subject.buildArgProviders({
          method: 'get',
          args: [
            {
              type: 'context',
            },
          ],
        });
        const args = await argsProvider(mockRequest, mockContext, testUserAccount);

        expect(args[0]).toBe(mockContext);
      });
    });

    describe('user', () => {
      it('should provide user', async () => {
        const argsProvider = subject.buildArgProviders({
          method: 'get',
          args: [
            {
              type: 'user',
            },
          ],
        });
        const args = await argsProvider(mockRequest, mockContext, testUserAccount);

        expect(args[0]).toBe(testUserAccount);
      });
    });

    describe('body', () => {
      let argsProvider: AsyncHttpRequestArgsProvider;

      beforeEach(() => {
        argsProvider = subject.buildArgProviders({
          method: 'put',
          args: [
            {
              type: 'body',
              schema: z.object({
                items: z
                  .object({
                    text: z.string(),
                    number: z.number().optional(),
                  })
                  .array(),
              }),
            },
          ],
        });
      });

      it('should provide body', async () => {
        const testBody = {
          items: [
            {
              text: 'text1',
              number: 123,
            },
            {
              text: 'text2',
            },
          ],
        };
        mockRequest.json.mockResolvedValue(testBody);
        const args = await argsProvider(mockRequest, mockContext, testUserAccount);

        expect(args[0]).toEqual(testBody);
      });

      it('should fail if body is not conform with schema', async () => {
        const testBody = {
          items: [
            {
              text: 'text1',
              number: false,
            },
            {
              test: 'text2',
            },
          ],
        };
        mockRequest.json.mockResolvedValue(testBody);

        await expect(argsProvider(mockRequest, mockContext, testUserAccount)).rejects.toThrowWithMessage(
          BadRequestError,
          /^Error parsing request body:/,
        );
      });

      it('should fail if body reading throws an error', async () => {
        mockRequest.json.mockRejectedValue(new Error('Unknown error.'));

        await expect(argsProvider(mockRequest, mockContext, testUserAccount)).rejects.toThrowWithMessage(
          BadRequestError,
          /^Unknown error\./,
        );
      });
    });

    describe('query', () => {
      let argsProvider: AsyncHttpRequestArgsProvider;

      describe('unknown', () => {
        it('should return optionally undefined if query parameter is unknown', async () => {
          argsProvider = subject.buildArgProviders({
            method: 'get',
            args: [
              {
                type: 'query',
                name: 'unknown-query',
              },
            ],
          });
          const args = await argsProvider(mockRequest, mockContext, testUserAccount);
          expect(args[0]).toBeUndefined();
        });
      });

      describe('untyped', () => {
        it('should return string query parameter if single', async () => {
          argsProvider = subject.buildArgProviders({
            method: 'get',
            args: [
              {
                type: 'query',
                name: 'number-query-single',
              },
            ],
          });

          const args = await argsProvider(mockRequest, mockContext, testUserAccount);
          expect(args[0]).toEqual('3951');
        });
      });

      describe('boolean', () => {
        it('should return boolean query parameter', async () => {
          argsProvider = subject.buildArgProviders({
            method: 'get',
            args: [
              {
                type: 'query',
                name: 'boolean-query1',
                schema: z.boolean(),
              },
              {
                type: 'query',
                name: 'boolean-query2',
                schema: z.boolean(),
              },
            ],
          });
          const args = await argsProvider(mockRequest, mockContext, testUserAccount);

          expect(args).toEqual([true, false]);
        });

        it('should return bad request if boolean is not coerced from string', async () => {
          argsProvider = subject.buildArgProviders({
            method: 'get',
            args: [
              {
                type: 'query',
                name: 'number-query',
                schema: z.boolean(),
              },
            ],
          });
          await expect(argsProvider(mockRequest, mockContext, testUserAccount)).rejects.toThrowWithMessage(
            BadRequestError,
            /^Error parsing query item=number-query:/,
          );
        });
      });

      describe('number', () => {
        it('should return number query parameter', async () => {
          argsProvider = subject.buildArgProviders({
            method: 'get',
            args: [
              {
                type: 'query',
                name: 'number-query-single',
                schema: z.number(),
              },
            ],
          });
          const args = await argsProvider(mockRequest, mockContext, testUserAccount);

          expect(args[0]).toEqual(3951);
        });

        it('should return undefined if parameter is unknown and schema is optional', async () => {
          argsProvider = subject.buildArgProviders({
            method: 'get',
            args: [
              {
                type: 'query',
                name: 'unknown-item',
                schema: z.number().optional(),
              },
            ],
          });
          const args = await argsProvider(mockRequest, mockContext, testUserAccount);

          expect(args[0]).toBeUndefined();
        });

        it('should return array number query parameter', async () => {
          argsProvider = subject.buildArgProviders({
            method: 'get',
            args: [
              {
                type: 'query',
                name: 'number-query-multi',
                schema: z.number().array(),
              },
            ],
          });
          const args = await argsProvider(mockRequest, mockContext, testUserAccount);

          expect(args[0]).toEqual([146, 553]);
        });

        it('should return empty array if parameter is unknown and schema is multiple', async () => {
          argsProvider = subject.buildArgProviders({
            method: 'get',
            args: [
              {
                type: 'query',
                name: 'unknown-item',
                schema: z.number().array(),
              },
            ],
          });
          const args = await argsProvider(mockRequest, mockContext, testUserAccount);

          expect(args[0]).toBeEmpty();
        });

        it('should return first element of multiple number query parameters if schema is single', async () => {
          argsProvider = subject.buildArgProviders({
            method: 'get',
            args: [
              {
                type: 'query',
                name: 'number-query-multi',
                schema: z.number(),
              },
            ],
          });
          const args = await argsProvider(mockRequest, mockContext, testUserAccount);

          expect(args[0]).toEqual(146);
        });

        it('should return bad request if number is not coerced from string', async () => {
          argsProvider = subject.buildArgProviders({
            method: 'get',
            args: [
              {
                type: 'query',
                name: 'text-query-single',
                schema: z.number(),
              },
            ],
          });
          await expect(argsProvider(mockRequest, mockContext, testUserAccount)).rejects.toThrowWithMessage(
            BadRequestError,
            /^Error parsing query item=text-query-single:/,
          );
        });
      });

      describe('string', () => {
        it('should return string query parameter', async () => {
          argsProvider = subject.buildArgProviders({
            method: 'get',
            args: [
              {
                type: 'query',
                name: 'text-query-single',
                schema: z.string(),
              },
            ],
          });
          const args = await argsProvider(mockRequest, mockContext, testUserAccount);

          expect(args[0]).toEqual('query-item');
        });

        it('should return undefined if parameter is unknown and schema is optional', async () => {
          argsProvider = subject.buildArgProviders({
            method: 'get',
            args: [
              {
                type: 'query',
                name: 'unknown-item',
                schema: z.string().optional(),
              },
            ],
          });
          const args = await argsProvider(mockRequest, mockContext, testUserAccount);

          expect(args[0]).toBeUndefined();
        });

        it('should return array string query parameter', async () => {
          argsProvider = subject.buildArgProviders({
            method: 'get',
            args: [
              {
                type: 'query',
                name: 'text-query-multi',
                schema: z.string().array(),
              },
            ],
          });
          const args = await argsProvider(mockRequest, mockContext, testUserAccount);

          expect(args[0]).toEqual(['query-item1', 'query-item2']);
        });

        it('should return empty array if parameter is unknown and schema is multiple', async () => {
          argsProvider = subject.buildArgProviders({
            method: 'get',
            args: [
              {
                type: 'query',
                name: 'unknown-item',
                schema: z.string().array(),
              },
            ],
          });
          const args = await argsProvider(mockRequest, mockContext, testUserAccount);

          expect(args[0]).toBeEmpty();
        });

        it('should return first element of multiple string query parameters if schema is single', async () => {
          argsProvider = subject.buildArgProviders({
            method: 'get',
            args: [
              {
                type: 'query',
                name: 'text-query-multi',
                schema: z.string(),
              },
            ],
          });
          const args = await argsProvider(mockRequest, mockContext, testUserAccount);

          expect(args[0]).toEqual('query-item1');
        });
      });
    });

    describe('path', () => {
      let argsProvider: AsyncHttpRequestArgsProvider;

      describe('unknown', () => {
        it('should fail if path parameter is unknown', async () => {
          argsProvider = subject.buildArgProviders({
            method: 'get',
            args: [
              {
                type: 'path',
                name: 'unknown-path',
              },
            ],
          });
          await expect(argsProvider(mockRequest, mockContext, testUserAccount)).rejects.toThrowWithMessage(
            BadRequestError,
            /^Error parsing path parameter=unknown-path:/,
          );
        });
      });

      describe('untyped', () => {
        it('should return string path parameter', async () => {
          argsProvider = subject.buildArgProviders({
            method: 'get',
            args: [
              {
                type: 'path',
                name: 'path-item1',
              },
            ],
          });

          const args = await argsProvider(mockRequest, mockContext, testUserAccount);
          expect(args[0]).toEqual('12');
        });
      });

      describe('number', () => {
        it('should return number query parameter', async () => {
          argsProvider = subject.buildArgProviders({
            method: 'get',
            args: [
              {
                type: 'path',
                name: 'path-item1',
                schema: z.number(),
              },
            ],
          });
          const args = await argsProvider(mockRequest, mockContext, testUserAccount);

          expect(args[0]).toEqual(12);
        });

        it('should return bad request if cannot be parsed', async () => {
          argsProvider = subject.buildArgProviders({
            method: 'get',
            args: [
              {
                type: 'path',
                name: 'path-item1',
                schema: z.number().min(25),
              },
            ],
          });

          await expect(argsProvider(mockRequest, mockContext, testUserAccount)).rejects.toThrowWithMessage(
            BadRequestError,
            /^Error parsing path parameter=path-item1:/,
          );
        });

        it('should return bad request if number is not coerced from string', async () => {
          argsProvider = subject.buildArgProviders({
            method: 'get',
            args: [
              {
                type: 'path',
                name: 'path-item2',
                schema: z.number(),
              },
            ],
          });
          await expect(argsProvider(mockRequest, mockContext, testUserAccount)).rejects.toThrowWithMessage(
            BadRequestError,
            /^Error parsing path parameter=path-item2:/,
          );
        });
      });

      describe('string', () => {
        it('should return string path parameter', async () => {
          argsProvider = subject.buildArgProviders({
            method: 'get',
            args: [
              {
                type: 'path',
                name: 'path-item1',
                schema: z.string(),
              },
            ],
          });
          const args = await argsProvider(mockRequest, mockContext, testUserAccount);

          expect(args[0]).toEqual('12');
        });
      });

      it('should return bad request if cannot be parsed', async () => {
        argsProvider = subject.buildArgProviders({
          method: 'get',
          args: [
            {
              type: 'path',
              name: 'path-item2',
              schema: z.string().min(20),
            },
          ],
        });

        await expect(argsProvider(mockRequest, mockContext, testUserAccount)).rejects.toThrowWithMessage(
          BadRequestError,
          /^Error parsing path parameter=path-item2:/,
        );
      });
    });

    describe('header', () => {
      let argsProvider: AsyncHttpRequestArgsProvider;

      describe('unknown', () => {
        it('should return undefined, if header item is unknown', async () => {
          argsProvider = subject.buildArgProviders({
            method: 'get',
            args: [
              {
                type: 'header',
                name: 'unknown-header',
              },
            ],
          });
          const args = await argsProvider(mockRequest, mockContext, testUserAccount);
          expect(args[0]).toBeUndefined();
        });
      });

      describe('untyped', () => {
        it('should return string path parameter', async () => {
          argsProvider = subject.buildArgProviders({
            method: 'get',
            args: [
              {
                type: 'header',
                name: 'header-item1',
              },
            ],
          });

          const args = await argsProvider(mockRequest, mockContext, testUserAccount);
          expect(args[0]).toEqual('12');
        });
      });

      describe('string', () => {
        it('should return string header item', async () => {
          argsProvider = subject.buildArgProviders({
            method: 'get',
            args: [
              {
                type: 'header',
                name: 'header-item2',
                schema: z.string(),
              },
            ],
          });
          const args = await argsProvider(mockRequest, mockContext, testUserAccount);

          expect(args[0]).toEqual('text');
        });

        it('should return bad request if cannot be parsed', async () => {
          argsProvider = subject.buildArgProviders({
            method: 'get',
            args: [
              {
                type: 'header',
                name: 'header-item2',
                schema: z.string().min(20),
              },
            ],
          });

          await expect(argsProvider(mockRequest, mockContext, testUserAccount)).rejects.toThrowWithMessage(
            BadRequestError,
            /^Error parsing header item=header-item2:/,
          );
        });
      });
    });
  });
});
