import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { mock, MockProxy } from 'jest-mock-extended';
import { z } from 'zod';
import { HttpControllerDefinitionError } from './http-controller-platform.model';
import { HttpOperationRegistrationData } from './http-controller-registration.service';
import { OpenAPIObjectConfig } from './http-controller.model';
import { OpenApiDefinitionService } from './open-api-definition.service';
import { OpenApiMetadataService } from './open-api-metadata.service';
import { RestOpenApiEntries } from './rest-open-api.regstry';

describe('OpenApiDefinitionService', () => {
  let testApiEntries: RestOpenApiEntries;
  let registry1: OpenAPIRegistry;
  let registry2: OpenAPIRegistry;

  let subject: OpenApiDefinitionService;

  let mockApiMetadataService: MockProxy<OpenApiMetadataService>;

  beforeEach(() => {
    registry1 = new OpenAPIRegistry();
    registry2 = new OpenAPIRegistry();

    testApiEntries = {
      'test-application1': {
        application: {
          name: 'test-application1',
          context: 'test-contest-1',
          openApiConfig: {} as OpenAPIObjectConfig,
        },
        registry: registry1,
      },
      'test-application2': {
        application: {
          name: 'test-application2',
          context: 'test-contest-2',
          openApiConfig: {
            openapi: '3.0.1',
            info: {
              version: '1.0.0',
              title: 'unknown',
            },
            tags: [{ name: 'tag1' }, { name: 'tag2', description: 'tag2 description' }],
            security: [
              {
                OAuth2: ['scope1', 'scope2'],
              },
            ],
          },
        },
        registry: registry2,
      },
    };

    mockApiMetadataService = mock();
    subject = new OpenApiDefinitionService(mockApiMetadataService, testApiEntries);
  });

  describe('getApplications', () => {
    it('should return no applications if not registered', () => {
      const applications = subject.getApplications();

      expect(applications).toEqual(['test-application1', 'test-application2']);
    });

    it('should return existing application', () => {
      const application = subject.getApplication('test-application1');

      expect(application).toMatchObject({
        name: 'test-application1',
        context: 'test-contest-1',
      });
    });

    it('should throw if application is unknown', () => {
      expect(() => subject.getApplication('unknown-application')).toThrowWithMessage(
        Error,
        'Unknown OpenAPI definition: unknown-application.',
      );
    });
  });

  describe('getRegistry', () => {
    it('should return Open API registry', () => {
      const registry = subject.getRegistry('test-application2');

      expect(registry).toBeInstanceOf(OpenAPIRegistry);
    });

    it('should return registry for default Open API Definition', () => {
      const registry = subject.getRegistry();

      expect(registry).toBeInstanceOf(OpenAPIRegistry);
    });

    it('should throw if Open API definition is unknown', () => {
      expect(() => subject.getRegistry('unknown-definition')).toThrowWithMessage(
        HttpControllerDefinitionError,
        'Unknown OpenAPI definition: unknown-definition.',
      );
    });

    it('should throw if Open API definition name was not set', () => {
      expect(() => subject.getRegistry('')).toThrowWithMessage(
        HttpControllerDefinitionError,
        'OpenAPI definition is not set.',
      );
    });
  });

  describe('generateDocument', () => {
    it('should generate bare OPEN API Definition document', () => {
      const apiDocument = subject.generateDocument('test-application2', 'test-api-url');
      expect(apiDocument).toMatchObject({
        openapi: '3.0.1',
        servers: [
          {
            url: 'test-api-url/test-contest-2',
          },
        ],
        tags: [
          {
            name: 'tag1',
          },
          {
            description: 'tag2 description',
            name: 'tag2',
          },
        ],
        info: {
          title: 'unknown',
          version: '1.0.0',
        },
        paths: {},
        components: {
          parameters: {},
          schemas: {},
        },
        security: [
          {
            OAuth2: ['scope1', 'scope2'],
          },
        ],
      });
    });

    it('should throw if Open API definition is unknown', () => {
      expect(() => subject.generateDocument('unknown-definition')).toThrowWithMessage(
        HttpControllerDefinitionError,
        'Unknown OpenAPI definition: unknown-definition.',
      );
    });

    it('should throw if Open API definition name was not set', () => {
      expect(() => subject.generateDocument('')).toThrowWithMessage(
        HttpControllerDefinitionError,
        'OpenAPI definition is not set.',
      );
    });
  });

  describe('registerOperation', () => {
    it('should register operation definition', () => {
      const registrationData = {
        application: { name: 'test-application2' },
        operationMetadata: {
          method: 'post',
          path: 'test-path',
          operationId: 'test-operation',
          requestBody: {
            content: {
              'application/json': {
                schema: z.string(),
              },
            },
          },
        },
        route: 'test-route',
      } as unknown as HttpOperationRegistrationData;

      mockApiMetadataService.getTags.mockReturnValue(['tag1', 'tag2']);
      mockApiMetadataService.getRequest.mockReturnValue({
        body: {
          content: {
            'application/json': {
              schema: z.string(),
            },
          },
        },
      });

      subject.registerOperation(registrationData);

      expect(registry2.definitions).toMatchObject([
        {
          route: {
            method: 'post',
            operationId: 'test-operation',
            path: '/test-route',
            tags: ['tag1', 'tag2'],
            request: {
              body: {
                content: {
                  'application/json': {},
                },
              },
            },
          },
          type: 'route',
        },
      ]);
    });

    it('should register operation without operationId', () => {
      const registrationData = {
        application: { name: 'test-application2' },
        operation: 'getTestData',
        operationMetadata: {
          method: 'get',
          path: 'test-path',
        },
        route: 'test-route',
      } as unknown as HttpOperationRegistrationData;

      mockApiMetadataService.getTags.mockReturnValue(undefined);
      mockApiMetadataService.getRequest.mockReturnValue({});

      subject.registerOperation(registrationData);

      expect(registry2.definitions).toMatchObject([
        {
          route: {
            method: 'get',
            operationId: 'getTestData',
          },
        },
      ]);
    });
  });
});
