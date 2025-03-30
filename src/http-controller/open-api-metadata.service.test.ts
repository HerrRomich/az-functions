import { z, ZodObject, ZodRawShape, ZodType } from 'zod';
import { ControllerMetadata, ControllerOperationMetadata } from './decorators';
import { OpenApiMetadataService } from './open-api-metadata.service';

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
    it('should return route config request', () => {
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
      } as unknown as ControllerOperationMetadata;

      const request = subject.getRequest(testOperationMetadata);

      const requestParams = request?.params as ZodObject<ZodRawShape>;
      expect(requestParams.shape['test-path-parameter1']?._def.typeName).toEqual('ZodBoolean');
      expect(requestParams.shape['test-path-parameter2']?._def.typeName).toEqual('ZodString');
      const requestHeaders = request?.headers as ZodObject<ZodRawShape>;
      expect(requestHeaders.shape['test-header-item1']?._def.typeName).toEqual('ZodString');
      expect(requestHeaders.shape['test-header-item2']?._def).toMatchObject({
        typeName: 'ZodOptional',
        innerType: { _def: { typeName: 'ZodString' } },
      });
      const requestQueryParams = request?.query as ZodObject<ZodRawShape>;
      expect(requestQueryParams.shape['test-query-item1']?._def).toMatchObject({
        typeName: 'ZodOptional',
        innerType: { _def: { typeName: 'ZodArray', type: { _def: { typeName: 'ZodString' } } } },
      });
      expect(requestQueryParams.shape['test-query-item2']?._def).toMatchObject({
        typeName: 'ZodOptional',
        innerType: { _def: { typeName: 'ZodArray', type: { _def: { typeName: 'ZodNumber' } } } },
      });
      expect(requestQueryParams.shape['test-query-item3']?._def).toMatchObject({
        typeName: 'ZodOptional',
        innerType: { _def: { typeName: 'ZodString' } },
      });
      const requestBody = request?.body?.content['application/json']?.schema as ZodObject<ZodRawShape>;
      expect(requestBody?.shape['prop1']?._def.typeName).toEqual('ZodBoolean');
    });
  });

  describe('getResponse', () => {
    it('should return no content if no responses set', () => {
      const response = subject.getResponse({} as unknown as ControllerOperationMetadata);

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
      const response = subject.getResponse(testOperationMetadata);

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
    const response = subject.getResponse(testOperationMetadata);

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
    const response = subject.getResponse(testOperationMetadata);

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
