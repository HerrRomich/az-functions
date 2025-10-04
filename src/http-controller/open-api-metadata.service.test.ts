import { z, ZodArray, ZodBoolean, ZodNumber, ZodOptional, ZodString, ZodType } from 'zod';
import { ControllerMetadata, ControllerOperationMetadata } from './decorators';
import { OpenApiMetadataService } from './open-api-metadata.service';
import { PartialDeep } from 'type-fest';

describe('OpenApiMetadataService', () => {
  let subject: OpenApiMetadataService;

  beforeEach(() => {
    subject = new OpenApiMetadataService();
  });

  describe('getTags', () => {
    it('should return distinct list of tags from controller metadata and operation metadata', () => {
      const testControllerMetadata = {
        tags: ['tag1', 'tag2'],
      } as unknown as ControllerMetadata;
      const testOperationMetadata = {
        tags: ['tag1', 'tag3'],
      } as unknown as ControllerOperationMetadata;

      const tags = subject.getTags(testControllerMetadata, testOperationMetadata);

      expect(tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should return list of tags from controller metadata, if operation metadata has no tags', () => {
      const testControllerMetadata = {
        tags: ['tag1', 'tag2'],
      } as unknown as ControllerMetadata;
      const testOperationMetadata = {} as unknown as ControllerOperationMetadata;

      const tags = subject.getTags(testControllerMetadata, testOperationMetadata);

      expect(tags).toEqual(['tag1', 'tag2']);
    });

    it('should return list of tags from operation metadata, if controller metadata has no tags', () => {
      const testControllerMetadata = {} as unknown as ControllerMetadata;
      const testOperationMetadata = {
        tags: ['tag1', 'tag3'],
      } as unknown as ControllerOperationMetadata;

      const tags = subject.getTags(testControllerMetadata, testOperationMetadata);

      expect(tags).toEqual(['tag1', 'tag3']);
    });

    it('should return undefined, if controller metadata abd operation metadata have no tags', () => {
      const testControllerMetadata = {} as unknown as ControllerMetadata;
      const testOperationMetadata = {} as unknown as ControllerOperationMetadata;

      const tags = subject.getTags(testControllerMetadata, testOperationMetadata);

      expect(tags).toBeUndefined();
    });
  });

  describe('getRequest', () => {
    const testOperationMetadata = {
      args: [
        {
          type: 'path',
          name: 'test-path-parameter1',
          schema: z.boolean(),
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
        {
          type: 'user',
        },
      ],
    } as PartialDeep<ControllerOperationMetadata> as ControllerOperationMetadata;
    let request: ReturnType<OpenApiMetadataService['getRequest']>;

    beforeEach(() => {
      request = subject.getRequest(testOperationMetadata);
    });

    it('should return route config request object with params', () => {
      const requestParams = request?.params;
      if (requestParams?.type !== 'object') {
        throw new Error('Request params is not an object');
      }
      expect(requestParams.shape['test-path-parameter1']).toBeInstanceOf(ZodBoolean);
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
    it('should return no content if no responses set', () => {
      const response = subject.getResponses({} as unknown as ControllerOperationMetadata);

      expect(response).toEqual({
        204: {
          description: 'Default no content',
        },
      });
    });

    it('should return one, taken from response definition with default status', () => {
      const testSchema = {} as ZodType<unknown>;
      const testOperationMetadata = {
        response: {
          description: 'test response',
          contentSchema: testSchema,
        },
      } as ControllerOperationMetadata;
      const response = subject.getResponses(testOperationMetadata);

      expect(response).toEqual({
        200: {
          content: {
            'application/json': {
              schema: testSchema,
            },
          },
          description: 'test response',
        },
      });
    });
  });

  it('should return one, taken from response definition with dedicated status', () => {
    const testSchema = {} as ZodType<unknown>;
    const testOperationMetadata = {
      response: {
        status: 201,
        description: 'test response',
        contentSchema: testSchema,
      },
    } as ControllerOperationMetadata;
    const response = subject.getResponses(testOperationMetadata);

    expect(response).toEqual({
      201: {
        content: {
          'application/json': {
            schema: testSchema,
          },
        },
        description: 'test response',
      },
    });
  });

  it('should responses, overwritten by response', () => {
    const testSchema = {} as ZodType<unknown>;
    const testOperationMetadata = {
      response: {
        status: 201,
        description: 'test response',
        contentSchema: testSchema,
      },
      responses: {
        201: {
          description: 'created',
        },
        400: {
          description: 'Bad request',
        },
      },
    } as unknown as ControllerOperationMetadata;
    const response = subject.getResponses(testOperationMetadata);

    expect(response).toEqual({
      201: {
        content: {
          'application/json': {
            schema: {},
          },
        },
        description: 'test response',
      },
      400: {
        description: 'Bad request',
      },
    });
  });
});
