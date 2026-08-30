import { HttpRequest, InvocationContext } from '@azure/functions';
import { mock, mockFn, MockProxy } from 'jest-mock-extended';
import { AuthContext } from 'security';
import { HandlerArgsParseError } from 'shared';
import { getPartialFixture } from 'test-utilities';
import { Writable } from 'type-fest';
import { z } from 'zod';
import { BadRequestError } from './http-controller.model';
import { HttpRequestArgProvider, HttpRequestProcessorInput } from './http-handler-support.factory';
import { HttpRequestArgProviderFactory } from './http-request-arg-provider.factory';

describe('HttpRequestArgProviderFactory', () => {
  let testInput: HttpRequestProcessorInput;
  let mockRequest: Writable<MockProxy<HttpRequest>>;

  let subject: HttpRequestArgProviderFactory;

  beforeEach(() => {
    mockRequest = mock<HttpRequest>();

    mockRequest.params = {
      'string-path-param': 'string-value',
      'number-path-param': '123',
    };
    mockRequest.headers = new Headers({
      'test-header': 'test-value',
    });
    mockRequest.url =
      'https://test-url.com/test-path?string-query-param=string-value&number-query-param=123&true-query-param=true&false-query-param=false&array-query-param=value1&array-query-param=value2';

    mockRequest.json.mockResolvedValue({ 'test-prop': 'test-value' });
    testInput = getPartialFixture<HttpRequestProcessorInput>({
      request: mockRequest,
    });

    subject = new HttpRequestArgProviderFactory();
  });

  describe('createBodyArgProvider', () => {
    it('should create a body arg provider that parses the request body with the provided schema', async () => {
      const provider = subject.createBodyArgProvider(z.object({ 'test-prop': z.string() }));

      const result = await provider(testInput);

      expect(result).toEqual({ 'test-prop': 'test-value' });
    });

    it('should throw HandlerArgsParseError if the request body does not conform to the provided schema', async () => {
      const provider = subject.createBodyArgProvider(z.object({ 'test-prop': z.number() }));

      await expect(provider(testInput)).rejects.toThrowWithMessage(
        HandlerArgsParseError,
        'Failed parsing request body',
      );
    });

    it('should throw unknown error if the request body cannot be read', async () => {
      const unknownError = new Error('Unknown error.');
      mockRequest.json.mockRejectedValue(unknownError);
      const provider = subject.createBodyArgProvider(z.object({ 'test-prop': z.number() }));

      await expect(provider(testInput)).rejects.toThrow(unknownError);
    });
  });

  describe('createPathParamArgProvider', () => {
    it('should create a path param arg provider that parses the request path parameters without schema', async () => {
      const provider = subject.createPathParamArgProvider({
        name: 'string-path-param',
        type: 'path',
      });

      const result = await provider(testInput);

      expect(result).toEqual('string-value');
    });

    it('should create a path param arg provider that parses the request path parameters with string schema', async () => {
      const provider = subject.createPathParamArgProvider({
        name: 'string-path-param',
        type: 'path',
        schema: z.string(),
      });

      const result = await provider(testInput);

      expect(result).toEqual('string-value');
    });

    it('should create a path param arg provider that parses the request path parameters with number schema', async () => {
      const provider = subject.createPathParamArgProvider({
        name: 'number-path-param',
        type: 'path',
        schema: z.number(),
      });

      const result = await provider(testInput);

      expect(result).toEqual(123);
    });

    it('should throw HandlerArgsParseError if the request path parameter does not conform to the provided schema', async () => {
      const provider = subject.createPathParamArgProvider({
        name: 'string-path-param',
        type: 'path',
        schema: z.number(),
      });

      await expect(async () => await provider(testInput)).rejects.toThrowWithMessage(
        HandlerArgsParseError,
        'Failed parsing path parameter string-path-param',
      );
    });
  });

  describe('createHeaderProvider', () => {
    it('should create a header provider that parses the request headers with the provided schema', async () => {
      const provider = subject.createHeaderProvider('test-header', z.string());

      const result = await provider(testInput);

      expect(result).toEqual('test-value');
    });

    it('should throw HandlerArgsParseError if the request header does not conform to the provided schema', async () => {
      const provider = subject.createHeaderProvider('unknown-test-header', z.string());

      await expect(async () => await provider(testInput)).rejects.toThrowWithMessage(
        HandlerArgsParseError,
        'Failed parsing header parameter unknown-test-header',
      );
    });
  });

  describe('createQueryItemArgProvider', () => {
    it('should create a query item arg provider that parses the request query parameters without schema', async () => {
      const provider = subject.createQueryItemArgProvider({
        name: 'string-query-param',
        type: 'query',
      });

      const result = await provider(testInput);

      expect(result).toEqual('string-value');
    });

    it('should create a query item arg provider that parses the request query parameters with the string schema', async () => {
      const provider = subject.createQueryItemArgProvider({
        name: 'string-query-param',
        type: 'query',
        schema: z.string(),
      });

      const result = await provider(testInput);

      expect(result).toEqual('string-value');
    });

    it('should create a query item arg provider that parses the request query parameters with the number schema', async () => {
      const provider = subject.createQueryItemArgProvider({
        name: 'number-query-param',
        type: 'query',
        schema: z.number(),
      });

      const result = await provider(testInput);

      expect(result).toEqual(123);
    });

    it('should create a query item arg provider that parses the true request query parameters with the boolean schema', async () => {
      const provider = subject.createQueryItemArgProvider({
        name: 'true-query-param',
        type: 'query',
        schema: z.boolean(),
      });

      const result = await provider(testInput);

      expect(result).toEqual(true);
    });

    it('should create a query item arg provider that parses the false request query parameters with the boolean schema', async () => {
      const provider = subject.createQueryItemArgProvider({
        name: 'false-query-param',
        type: 'query',
        schema: z.boolean(),
      });

      const result = await provider(testInput);

      expect(result).toEqual(false);
    });

    it('should create a query item arg provider that parses the request query parameters with the array schema', async () => {
      const provider = subject.createQueryItemArgProvider({
        name: 'array-query-param',
        type: 'query',
        schema: z.array(z.string()),
      });

      const result = await provider(testInput);

      expect(result).toEqual(['value1', 'value2']);
    });

    it('should throw HandlerArgsParseError if the request query parameter does not conform to the provided schema', async () => {
      const provider = subject.createQueryItemArgProvider({
        name: 'unknown-test-query-item',
        type: 'query',
        schema: z.string(),
      });

      await expect(async () => await provider(testInput)).rejects.toThrowWithMessage(
        HandlerArgsParseError,
        'Failed parsing query parameter unknown-test-query-item',
      );
    });

    it('should throw HandlerArgsParseError if the request query parameter cannot be coerced to the provided schema', async () => {
      const provider = subject.createQueryItemArgProvider({
        name: 'string-query-param',
        type: 'query',
        schema: z.boolean(),
      });

      await expect(async () => await provider(testInput)).rejects.toThrowWithMessage(
        HandlerArgsParseError,
        'Failed parsing query parameter string-query-param',
      );
    });
  });

  describe('createArgsProvider', () => {
    let mockRequestInput: HttpRequestProcessorInput;
    let mockContext: MockProxy<InvocationContext>;
    let mockAuthContext: AuthContext;

    beforeEach(() => {
      mockContext = mock<InvocationContext>();
      mockAuthContext = mock<AuthContext>();
      mockRequestInput = getPartialFixture<HttpRequestProcessorInput>({
        request: mockRequest,
        invocationContext: mockContext,
        authContext: mockAuthContext,
      });
    });

    it('should create an args provider that returns an array of values from the provided arg providers', async () => {
      const provider1 = mockFn<HttpRequestArgProvider>().mockReturnValue(Promise.resolve('arg1'));
      const provider2 = mockFn<HttpRequestArgProvider>().mockReturnValue('arg2');
      const argsProvider = subject.createArgsProvider([provider1, provider2]);

      const result = await argsProvider(mockRequestInput);

      expect(result).toEqual(['arg1', 'arg2']);
    });

    it('should throw BadRequestError if any of the provided arg providers throws a BadRequestError', async () => {
      const provider1 = mockFn<HttpRequestArgProvider>().mockReturnValue(Promise.resolve('arg1'));
      const provider2 = mockFn<HttpRequestArgProvider>().mockImplementation(() => {
        throw new BadRequestError('Test error');
      });
      const argsProvider = subject.createArgsProvider([provider1, provider2]);

      await expect(argsProvider(mockRequestInput)).rejects.toThrowWithMessage(
        BadRequestError,
        'Failed parsing request arguments',
      );
    });
  });
});
