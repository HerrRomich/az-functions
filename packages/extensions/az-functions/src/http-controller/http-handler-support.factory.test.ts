import { HttpRequest, InvocationContext } from '@azure/functions';
import { HttpResponseInit } from '@azure/functions/types/http';
import { CalledWithMock, mock, mockFn, MockProxy } from 'jest-mock-extended';
import { AuthContext } from 'security';
import { getPartialFixture } from 'test-utilities';
import { z } from 'zod';
import {
  ControllerOperationBodyArgMetadata,
  ControllerOperationHeaderArgMetadata,
  ControllerOperationPathArgMetadata,
  ControllerOperationQueryArgMetadata,
  DirectResponseObject,
} from './decorators';
import { InternalServerError, OptionalStringSchema } from './http-controller.model';
import {
  HttpHandlerSupportFactory,
  HttpRequestArgProvider,
  HttpRequestArgsProvider,
  HttpRequestProcessorInput,
  HttpResponseProcessor,
  HttpTriggerDefinitionError,
} from './http-handler-support.factory';
import { HttpRequestArgProviderFactory } from './http-request-arg-provider.factory';
import { HttpResponseProcessorFactory, ResponsePartialProcessor } from './http-response-processor.factory';

describe('HttpHandlerSupportFactory', () => {
  let mockArgsProviderFactory: MockProxy<HttpRequestArgProviderFactory>;
  let mockResponseProviderFactory: MockProxy<HttpResponseProcessorFactory>;
  let mockRequestArgsProvider: HttpRequestArgsProvider;
  let subject: HttpHandlerSupportFactory;

  beforeEach(() => {
    mockArgsProviderFactory = mock<HttpRequestArgProviderFactory>();
    mockRequestArgsProvider = mockFn<HttpRequestArgsProvider>();
    mockArgsProviderFactory.createArgsProvider.mockReturnValue(mockRequestArgsProvider);

    mockResponseProviderFactory = mock<HttpResponseProcessorFactory>();
    subject = new HttpHandlerSupportFactory(mockArgsProviderFactory, mockResponseProviderFactory);
  });

  describe('createRequestArgsProvider', () => {
    const testBodyArg: ControllerOperationBodyArgMetadata = {
      type: 'body',
      schema: z.object({
        items: z
          .object({
            text: z.string(),
            number: z.number().optional(),
          })
          .array(),
      }),
    };

    const mockAuthContext = getPartialFixture<AuthContext>({});
    const mockRequest = mock<HttpRequest>();
    const mockContext = mock<InvocationContext>();
    const testRequestProcessorInput = getPartialFixture<HttpRequestProcessorInput>({
      authContext: mockAuthContext,
      request: mockRequest,
      invocationContext: mockContext,
    });

    describe('validation', () => {
      it('should throw error if more than one body param is defined', () => {
        expect(() => subject.createRequestArgsProvider([testBodyArg, testBodyArg])).toThrowWithMessage(
          HttpTriggerDefinitionError,
          'Multiple body parameters are not allowed in a single operation.',
        );

        expect(mockArgsProviderFactory.createArgsProvider).not.toHaveBeenCalled();
      });

      it('should throw error if more than one request param is defined', () => {
        expect(() => subject.createRequestArgsProvider([{ type: 'request' }, { type: 'request' }])).toThrowWithMessage(
          HttpTriggerDefinitionError,
          'Multiple request parameters are not allowed in a single operation.',
        );

        expect(mockArgsProviderFactory.createArgsProvider).not.toHaveBeenCalled();
      });

      it('should throw error if both body and request params are defined', () => {
        expect(() => subject.createRequestArgsProvider([testBodyArg, { type: 'request' }])).toThrowWithMessage(
          HttpTriggerDefinitionError,
          'Cannot have both body and request parameters in a single operation.',
        );

        expect(mockArgsProviderFactory.createArgsProvider).not.toHaveBeenCalled();
      });
    });

    it('should create request args provider', () => {
      subject.createRequestArgsProvider([
        {
          type: 'request',
        },
        {
          type: 'invocationContext',
        },
        {
          type: 'authContext',
        },
      ]);

      expect(mockArgsProviderFactory.createArgsProvider).toHaveBeenCalledWith(expect.toBeArrayOfSize(3));
    });

    it('should create path param provider', () => {
      const testPathArg: ControllerOperationPathArgMetadata = {
        type: 'path',
        name: 'path-item1',
        schema: z.number(),
      };
      const mockPathArgProvider = mockFn<HttpRequestArgProvider>();
      mockArgsProviderFactory.createPathParamArgProvider.mockReturnValue(mockPathArgProvider);

      const requestArgsProvider = subject.createRequestArgsProvider([testPathArg]);

      expect(requestArgsProvider).toBe(mockRequestArgsProvider);
      expect(mockArgsProviderFactory.createArgsProvider).toHaveBeenCalledWith([mockPathArgProvider]);
      expect(mockArgsProviderFactory.createPathParamArgProvider).toHaveBeenCalledWith(testPathArg);
    });

    it('should create param provider for header without schema', () => {
      const testHeaderArg: ControllerOperationHeaderArgMetadata = {
        type: 'header',
        name: 'header-item1',
      };
      const mockHeaderArgProvider = mockFn<HttpRequestArgProvider>();
      mockArgsProviderFactory.createHeaderProvider.mockReturnValue(mockHeaderArgProvider);

      const requestArgsProvider = subject.createRequestArgsProvider([testHeaderArg]);

      expect(requestArgsProvider).toBe(mockRequestArgsProvider);
      expect(mockArgsProviderFactory.createArgsProvider).toHaveBeenCalledWith([mockHeaderArgProvider]);
      expect(mockArgsProviderFactory.createHeaderProvider).toHaveBeenCalledWith(
        testHeaderArg.name,
        OptionalStringSchema,
      );
    });

    it('should create param provider for header with schema', () => {
      const testHeaderArg: ControllerOperationHeaderArgMetadata = {
        type: 'header',
        name: 'header-item2',
        schema: z.string().optional(),
      };
      const mockHeaderArgProvider = mockFn<HttpRequestArgProvider>();
      mockArgsProviderFactory.createHeaderProvider.mockReturnValue(mockHeaderArgProvider);

      const requestArgsProvider = subject.createRequestArgsProvider([testHeaderArg]);

      expect(requestArgsProvider).toBe(mockRequestArgsProvider);
      expect(mockArgsProviderFactory.createArgsProvider).toHaveBeenCalledWith([mockHeaderArgProvider]);
      expect(mockArgsProviderFactory.createHeaderProvider).toHaveBeenCalledWith(
        testHeaderArg.name,
        testHeaderArg.schema,
      );
    });

    it('should create param provider for query', () => {
      const testQueryArg: ControllerOperationQueryArgMetadata = {
        type: 'query',
        name: 'boolean-query1',
        schema: z.boolean(),
      };
      const mockQueryArgProvider = mockFn<HttpRequestArgProvider>();
      mockArgsProviderFactory.createQueryItemArgProvider.mockReturnValue(mockQueryArgProvider);

      const requestArgsProvider = subject.createRequestArgsProvider([testQueryArg]);

      expect(requestArgsProvider).toBe(mockRequestArgsProvider);
      expect(mockArgsProviderFactory.createArgsProvider).toHaveBeenCalledWith([mockQueryArgProvider]);
      expect(mockArgsProviderFactory.createQueryItemArgProvider).toHaveBeenCalledWith(testQueryArg);
    });

    it('should create param provider for request', async () => {
      const requestArgsProvider = subject.createRequestArgsProvider([
        {
          type: 'request',
        },
      ]);

      expect(requestArgsProvider).toBe(mockRequestArgsProvider);
      expect(mockArgsProviderFactory.createArgsProvider).toHaveBeenCalledWith(expect.toBeArrayOfSize(1));
      const queryArgProvider = mockArgsProviderFactory.createArgsProvider.mock.calls[0]![0][0]!;
      expect(await queryArgProvider(testRequestProcessorInput)).toBe(mockRequest);
    });

    it('should create param provider for invocationContext', async () => {
      const requestArgsProvider = subject.createRequestArgsProvider([
        {
          type: 'invocationContext',
        },
      ]);

      expect(requestArgsProvider).toBe(mockRequestArgsProvider);
      expect(mockArgsProviderFactory.createArgsProvider).toHaveBeenCalledWith(expect.toBeArrayOfSize(1));
      const contextArgProvider = mockArgsProviderFactory.createArgsProvider.mock.calls[0]![0][0]!;
      expect(await contextArgProvider(testRequestProcessorInput)).toBe(mockContext);
    });

    it('should create param provider for authContext', async () => {
      const requestArgsProvider = subject.createRequestArgsProvider([
        {
          type: 'authContext',
        },
      ]);

      expect(requestArgsProvider).toBe(mockRequestArgsProvider);
      expect(mockArgsProviderFactory.createArgsProvider).toHaveBeenCalledWith(expect.toBeArrayOfSize(1));
      const userArgProvider = mockArgsProviderFactory.createArgsProvider.mock.calls[0]![0][0]!;
      expect(await userArgProvider(testRequestProcessorInput)).toBe(mockAuthContext);
    });

    it('should create param provider for body', async () => {
      const mockBodyArgProvider = mockFn<HttpRequestArgProvider>();
      mockArgsProviderFactory.createBodyArgProvider.mockReturnValue(mockBodyArgProvider);

      const requestArgsProvider = subject.createRequestArgsProvider([testBodyArg]);

      expect(requestArgsProvider).toBe(mockRequestArgsProvider);
      expect(mockArgsProviderFactory.createArgsProvider).toHaveBeenCalledWith([mockBodyArgProvider]);
      expect(mockArgsProviderFactory.createBodyArgProvider).toHaveBeenCalledWith(testBodyArg.schema);
    });

    it('should create param provider for undefined', async () => {
      const requestArgsProvider = subject.createRequestArgsProvider([
        {
          type: 'undefined',
        },
      ]);

      expect(requestArgsProvider).toBe(mockRequestArgsProvider);
      expect(mockArgsProviderFactory.createArgsProvider).toHaveBeenCalledWith(expect.toBeArrayOfSize(1));
      const undefinedArgProvider = mockArgsProviderFactory.createArgsProvider.mock.calls[0]![0][0]!;
      expect(await undefinedArgProvider(testRequestProcessorInput)).toBeUndefined();
    });
  });

  describe('createResponseProcessor', () => {
    let responseProcessor: HttpResponseProcessor;

    describe('without directResponse', () => {
      beforeEach(() => {
        responseProcessor = subject.createResponseProcessor();
      });

      it('should return input if it is an instance of HttpResponseInit', async () => {
        const testResponse: HttpResponseInit = {
          status: 200,
        };

        const result = await responseProcessor(testResponse);

        expect(result).toBe(testResponse);
      });

      it('should throw error if input is not HttpResponseInit', async () => {
        await expect(
          responseProcessor({
            test: 'test-string',
          }),
        ).rejects.toThrowWithMessage(
          InternalServerError,
          'Controller method should return HttpResponseInit when directResponse is not defined',
        );
      });
    });

    describe('with directResponse', () => {
      const testResponse = {
        testProperty: 'test-value',
      };

      const mockBodyProcessor: CalledWithMock<ResponsePartialProcessor> = mockFn<ResponsePartialProcessor>();
      const mockHeaderProcessor: CalledWithMock<ResponsePartialProcessor> = mockFn<ResponsePartialProcessor>();
      const mockStatusProcessor: CalledWithMock<ResponsePartialProcessor> = mockFn<ResponsePartialProcessor>();

      beforeEach(() => {
        mockResponseProviderFactory.provideJsonBodyProcessor.mockReturnValue(mockBodyProcessor);
        mockBodyProcessor.mockImplementation(async input => ({
          jsonBody: input.jsonBody,
        }));
        mockResponseProviderFactory.provideHeaderProcessor.mockReturnValue(mockHeaderProcessor);
        mockResponseProviderFactory.provideStatusProcessor.mockReturnValue(mockStatusProcessor);
        responseProcessor = subject.createResponseProcessor(getPartialFixture<DirectResponseObject>({}));
      });

      it('should fail if any of the partial processors fails', async () => {
        mockBodyProcessor.mockRejectedValue(new Error('Body processor failed'));

        await expect(responseProcessor(testResponse)).rejects.toThrowWithMessage(
          InternalServerError,
          'Failed processing response',
        );
        expect(mockBodyProcessor).toHaveBeenCalledWith({ jsonBody: testResponse });
        expect(mockHeaderProcessor).toHaveBeenCalledWith({ jsonBody: testResponse });
        expect(mockStatusProcessor).toHaveBeenCalledWith({ jsonBody: testResponse });
      });

      it('should call all partial processors and return HttpResponseInit ', async () => {
        mockHeaderProcessor.mockImplementation(async () => {
          return {
            headers: {
              'test-header': 'test-value',
            },
          };
        });
        mockStatusProcessor.mockImplementation(async () => {
          return {
            status: 201,
          };
        });

        const result = await responseProcessor(testResponse);

        expect(result.status).toEqual(201);
        const headers = new Headers(result.headers);
        expect(headers.get('test-header')).toEqual('test-value');
        expect(mockBodyProcessor).toHaveBeenCalledWith({ jsonBody: testResponse });
        expect(mockHeaderProcessor).toHaveBeenCalledWith({ jsonBody: testResponse });
        expect(mockStatusProcessor).toHaveBeenCalledWith({ jsonBody: testResponse });
      });

      it('should call all partial processors and return HttpResponseInit when input is HttpResponseInit', async () => {
        mockHeaderProcessor.mockImplementation(async () => {
          return {
            headers: {
              'test-header': 'test-value',
            },
          };
        });
        mockStatusProcessor.mockImplementation(async () => {
          return {
            status: 201,
          };
        });

        const responseInit = {
          jsonBody: testResponse,
          status: 201,
        };
        const result = await responseProcessor(responseInit);

        expect(result.status).toEqual(201);
        const headers = new Headers(result.headers);
        expect(headers.get('test-header')).toEqual('test-value');
        expect(mockBodyProcessor).toHaveBeenCalledWith(responseInit);
        expect(mockHeaderProcessor).toHaveBeenCalledWith(responseInit);
        expect(mockStatusProcessor).toHaveBeenCalledWith(responseInit);
      });
    });
  });
});
