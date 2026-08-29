import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { getPartialFixture } from '@utilities/test-utilities';
import { mock, MockProxy } from 'jest-mock-extended';
import { Logger } from 'logger';
import { PartialDeep } from 'type-fest';
import { z } from 'zod';
import { OpenAPIObjectConfig, RestApplication } from './http-controller.model';
import { HttpOperationRegistration } from './http-operations-registration.service';
import { OpenApiDefinitionError, OpenApiDefinitionService } from './open-api-definition.service';
import { OpenApiMetadataService } from './open-api-metadata.service';

describe('OpenApiDefinitionService', () => {
  const testApplication1: RestApplication = {
    name: 'test-application1',
    context: 'test-contest-1',
    openApiConfig: {} as OpenAPIObjectConfig,
  };
  const testApplication2: RestApplication = {
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
  };

  let mockApiMetadataService: MockProxy<OpenApiMetadataService>;

  let subject: OpenApiDefinitionService;

  beforeEach(() => {
    mockApiMetadataService = mock<OpenApiMetadataService>();
    subject = new OpenApiDefinitionService(() => mock<Logger>(), mockApiMetadataService);
    subject.addApplication(testApplication1);
    subject.addApplication(testApplication2);
  });

  describe('addApplication', () => {
    it('should add new application', () => {
      const newApplication = getPartialFixture<RestApplication>({
        name: 'new-application',
        context: 'new-contest',
        openApiConfig: {
          components: {
            schemas: {
              testComponent: {
                type: 'object',
                properties: {
                  testProperty: {
                    type: 'string',
                  },
                },
              },
            },
            parameters: {},
            requestBodies: {},
            responses: {},
            securitySchemes: {},
          },
        },
      });

      subject.addApplication(newApplication);

      const applications = subject.getApplications();
      expect(applications).toContain('new-application');
    });

    it('should throw if application already exists', () => {
      expect(() => subject.addApplication(testApplication1)).toThrowWithMessage(
        OpenApiDefinitionError,
        'OpenAPI definition for application test-application1 already exists',
      );
    });
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
        OpenApiDefinitionError,
        'Unknown OpenAPI definition for application unknown-application',
      );
    });

    it('should return default application if application name is not provided', () => {
      const application = subject.getApplication();

      expect(application).toMatchObject({
        name: 'default',
        context: 'default',
      });
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

    it('should set default Open API Definition if default definition is not set', () => {
      subject.getRegistry();
      const registry = subject.getRegistry();

      expect(registry).toBeInstanceOf(OpenAPIRegistry);
    });

    it('should throw if Open API definition is unknown', () => {
      expect(() => subject.getRegistry('unknown-definition')).toThrowWithMessage(
        OpenApiDefinitionError,
        'Unknown OpenAPI definition for application unknown-definition',
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

    it('should generate bare OPEN API Definition document without server part', () => {
      const apiDocument = subject.generateDocument('test-application2');
      expect(apiDocument).toMatchObject({
        openapi: '3.0.1',
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
        OpenApiDefinitionError,
        'Unknown OpenAPI definition for application unknown-definition',
      );
    });
  });

  describe('registerOperation', () => {
    it('should register controllerMethod definition', () => {
      const registrationData = {
        operationId: 'test-controllerMethod',
        application: { name: 'test-application2' },
        operationMetadata: {
          method: 'post',
          path: 'test-path',
          operationId: 'test-controllerMethod',
          requestBody: {
            content: {
              'application/json': {
                schema: z.string(),
              },
            },
          },
        },
        route: 'test-route',
      } as PartialDeep<HttpOperationRegistration> as HttpOperationRegistration;

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

      expect(subject.getRegistry('test-application2').definitions).toMatchObject([
        {
          route: {
            method: 'post',
            operationId: 'test-controllerMethod',
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

    it('should register controllerMethod without triggerId', () => {
      const registrationData = {
        operationId: 'getTestData',
        application: { name: 'test-application2' },
        operation: 'getTestData',
        operationMetadata: {
          method: 'get',
          path: 'test-path',
        },
        route: 'test-route',
      } as PartialDeep<HttpOperationRegistration> as HttpOperationRegistration;

      mockApiMetadataService.getTags.mockReturnValue(undefined);
      mockApiMetadataService.getRequest.mockReturnValue({});

      subject.registerOperation(registrationData);

      expect(subject.getRegistry('test-application2').definitions).toMatchObject([
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
