import { getPartialFixture } from 'test-utilities';
import { z, ZodArray, ZodNumber, ZodOptional, ZodString, ZodType } from 'zod';
import { ControllerOperationMetadata, HttpControllerMetadata } from './decorators';
import { OpenApiMetadataService } from './open-api-metadata.service';

describe('OpenApiMetadataService', () => {
  let subject: OpenApiMetadataService;

  beforeEach(() => {
    subject = new OpenApiMetadataService();
  });

  describe('getTags', () => {
    it('should return distinct list of tags from controller metadata and controllerMethod metadata', () => {
      const testControllerMetadata = getPartialFixture<HttpControllerMetadata>({
        tags: ['tag1', 'tag2'],
      });
      const testOperationMetadata = getPartialFixture<ControllerOperationMetadata>({
        tags: ['tag1', 'tag3'],
      });

      const tags = subject.getTags(testControllerMetadata, testOperationMetadata);

      expect(tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should return list of tags from controller metadata, if controllerMethod metadata has no tags', () => {
      const testControllerMetadata = getPartialFixture<HttpControllerMetadata>({
        tags: ['tag1', 'tag2'],
      });
      const testOperationMetadata = getPartialFixture<ControllerOperationMetadata>({});

      const tags = subject.getTags(testControllerMetadata, testOperationMetadata);

      expect(tags).toEqual(['tag1', 'tag2']);
    });

    it('should return list of tags from controllerMethod metadata, if controller metadata has no tags', () => {
      const testControllerMetadata = getPartialFixture<HttpControllerMetadata>({});
      const testOperationMetadata = getPartialFixture<ControllerOperationMetadata>({
        tags: ['tag1', 'tag3'],
      });

      const tags = subject.getTags(testControllerMetadata, testOperationMetadata);

      expect(tags).toEqual(['tag1', 'tag3']);
    });

    it('should return undefined, if controller metadata abd controllerMethod metadata have no tags', () => {
      const testControllerMetadata = getPartialFixture<HttpControllerMetadata>({});
      const testOperationMetadata = getPartialFixture<ControllerOperationMetadata>({});

      const tags = subject.getTags(testControllerMetadata, testOperationMetadata);

      expect(tags).toBeUndefined();
    });
  });

  describe('getRequest', () => {
    const testOperationMetadata = getPartialFixture<ControllerOperationMetadata>({
      args: [
        {
          type: 'path',
          name: 'test-path-parameter1',
          schema: z.string(),
        },
        {
          type: 'path',
          name: 'test-path-parameter2',
        },
        {
          type: 'header',
          name: 'test-header-item1',
          schema: z.string(),
        },
        {
          type: 'header',
          name: 'test-header-item2',
        },
        {
          type: 'query',
          name: 'test-query-item1',
          schema: z.array(z.string()).optional(),
        },
        {
          type: 'query',
          name: 'test-query-item2',
          schema: z.array(z.number()),
        },
        {
          type: 'query',
          name: 'test-query-item3',
        },
        {
          type: 'body',
          schema: z.object({
            prop1: z.boolean(),
          }),
        },
        { type: 'authContext' },
        { type: 'invocationContext' },
        { type: 'request' },
        { type: 'undefined' },
      ],
    });
    let request: ReturnType<OpenApiMetadataService['getRequest']>;

    beforeEach(() => {
      request = subject.getRequest(testOperationMetadata);
    });

    it('should return route config request object with params', () => {
      const requestParams = request?.params;
      if (requestParams?.type !== 'object') {
        throw new Error('Request params is not an object');
      }
      expect(requestParams.shape['test-path-parameter1']).toBeInstanceOf(ZodString);
      expect(requestParams.shape['test-path-parameter2']).toBeInstanceOf(ZodString);
    });

    it('should return route config request object with headers', () => {
      const requestHeaders = request?.headers;
      if (Array.isArray(requestHeaders) || requestHeaders?.type !== 'object') {
        throw new Error('Request headers is not an object');
      }
      expect(requestHeaders.shape['test-header-item1']).toBeInstanceOf(ZodString);
      const testHeaderItem2Type = requestHeaders.shape['test-header-item2'];
      if (!(testHeaderItem2Type instanceof ZodOptional)) {
        throw new Error('Request header item 2 is not optional');
      }
      expect(testHeaderItem2Type.unwrap()).toBeInstanceOf(ZodString);
    });

    it('should return route config request object with query', () => {
      const requestQuery = request?.query;
      if (Array.isArray(requestQuery) || requestQuery?.type !== 'object') {
        throw new Error('Request query is not an object');
      }
      const testQueryItem1Type = requestQuery.shape['test-query-item1'];
      if (!(testQueryItem1Type instanceof ZodOptional)) {
        throw new Error('Request header item 1 is not optional');
      }
      const testQueryItem1InnerType = testQueryItem1Type.unwrap();
      if (!(testQueryItem1InnerType instanceof ZodArray)) {
        throw new Error('Request header item 1 is not an array');
      }
      expect(testQueryItem1InnerType.element).toBeInstanceOf(ZodString);

      const testQueryItem2Type = requestQuery.shape['test-query-item2'];
      if (!(testQueryItem2Type instanceof ZodOptional)) {
        throw new Error('Request header item 2 is not optional');
      }
      const testQueryItem2InnerType = testQueryItem2Type.unwrap();
      if (!(testQueryItem2InnerType instanceof ZodArray)) {
        throw new Error('Request header item 2 is not an array');
      }
      expect(testQueryItem2InnerType.element).toBeInstanceOf(ZodNumber);

      const testQueryItem3Type = requestQuery.shape['test-query-item3'];
      if (!(testQueryItem3Type instanceof ZodOptional)) {
        throw new Error('Request header item 3 is not optional');
      }
      const testQueryItem3InnerType = testQueryItem3Type.unwrap();
      expect(testQueryItem3InnerType).toBeInstanceOf(ZodString);
    });
  });

  describe('getResponse', () => {
    it('should return no jsonContent if no responses set', () => {
      const testMetadata = getPartialFixture<ControllerOperationMetadata>({});
      const response = subject.getResponses(testMetadata);

      expect(response).toEqual({
        204: {
          description: 'Default no jsonContent',
        },
      });
    });

    it('should return one, taken from directResponse definition with default status', () => {
      const testSchema = {} as ZodType<unknown>;
      const testOperationMetadata = getPartialFixture<ControllerOperationMetadata>({
        directResponse: {
          description: 'test directResponse',
          jsonContent: {
            schema: testSchema,
          },
        },
      });
      const response = subject.getResponses(testOperationMetadata);

      expect(response).toEqual({
        200: {
          content: {
            'application/json': {
              schema: testSchema,
            },
          },
          description: 'test directResponse',
        },
      });
    });
  });

  it('should return one, taken from directResponse definition with dedicated status', () => {
    const testSchema = {} as ZodType<unknown>;
    const testOperationMetadata = getPartialFixture<ControllerOperationMetadata>({
      directResponse: {
        status: 201,
        description: 'test directResponse',
        jsonContent: {
          schema: testSchema,
        },
      },
    });
    const response = subject.getResponses(testOperationMetadata);

    expect(response).toEqual({
      201: {
        content: {
          'application/json': {
            schema: testSchema,
          },
        },
        description: 'test directResponse',
      },
    });
  });

  it('should return responses, overwritten by directResponse', () => {
    const testSchema = {} as ZodType<unknown>;
    const testOperationMetadata = getPartialFixture<ControllerOperationMetadata>({
      directResponse: {
        status: 201,
        description: 'test directResponse',
        jsonContent: {
          schema: testSchema,
        },
      },
      responses: {
        201: {
          description: 'created',
        },
        400: {
          description: 'Bad request',
        },
      },
    });
    const response = subject.getResponses(testOperationMetadata);

    expect(response).toEqual({
      201: {
        content: {
          'application/json': {
            schema: {},
          },
        },
        description: 'test directResponse',
      },
      400: {
        description: 'Bad request',
      },
    });
  });

  it('should return no jsonContent when direct directResponse has no jsonContent', () => {
    const testOperationMetadata = getPartialFixture<ControllerOperationMetadata>({
      directResponse: {
        status: 201,
        description: 'test directResponse',
      },
    });

    const response = subject.getResponses(testOperationMetadata);

    expect(response).toEqual({
      201: {
        description: 'test directResponse',
      },
    });
  });
});
