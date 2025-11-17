import { Container, ResolutionContext } from 'inversify';
import { mock, MockProxy } from 'jest-mock-extended';
import { PLATFORM_CONTAINER } from 'shared';
import { z } from 'zod';
import { HttpControllerDefinitionError } from './http-controller-platform.model';
import {
  API_RESPONSE,
  API_SCHEMA,
  ApiResponse,
  ApiSchema,
  OpenAPIObjectConfig,
  REST_APPLICATION,
  RestApplication,
} from './http-controller.model';
import { buildRestOpenApiRegistry } from './rest-open-api.regstry';
import { AuthenticationServiceFactory } from './security';

describe('buildRestOpenApiRegistry', () => {
  const testApplications = [
    {
      name: 'test-application1',
      context: 'test-contest-1',
      openApiConfig: {} as unknown as OpenAPIObjectConfig,
    } as RestApplication,
    {
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
      } as OpenAPIObjectConfig,
    } as RestApplication,
  ];

  const testSchemaEntries = [
    {
      name: 'schema1',
      schema: z.string(),
    } as ApiSchema,
    {
      name: 'schema2',
      schema: {
        type: 'string',
      },
    } as ApiSchema,
  ];

  const testResponseEntries = [
    {
      name: 'response1',
      response: { description: 'Response1' },
    } as ApiResponse,
    {
      name: 'response2',
      response: { description: 'Response2' },
    } as ApiResponse,
  ];

  let mockAuth: MockProxy<AuthenticationServiceFactory>;
  let mockPlatformContainer: MockProxy<Container>;
  let mockContext: MockProxy<ResolutionContext>;

  beforeEach(() => {
    mockAuth = mock();
    mockAuth.getSecurityScheme.calledWith('OAuth2').mockReturnValue({
      type: 'oauth2',
    });

    mockPlatformContainer = mock();
    mockPlatformContainer.getAll.calledWith(REST_APPLICATION).mockReturnValue(testApplications);

    mockPlatformContainer.getAll.calledWith(API_SCHEMA, expect.anything()).mockReturnValue([]);
    mockPlatformContainer.getAll
      .calledWith(API_SCHEMA, expect.objectContaining({ name: 'test-application1' }))
      .mockReturnValue(testSchemaEntries);

    mockPlatformContainer.getAll.calledWith(API_RESPONSE, expect.anything()).mockReturnValue([]);
    mockPlatformContainer.getAll
      .calledWith(API_RESPONSE, expect.objectContaining({ name: 'test-application2' }))
      .mockReturnValue(testResponseEntries);

    mockContext = mock();
    mockContext.get.calledWith(PLATFORM_CONTAINER).mockReturnValue(mockPlatformContainer);
    mockContext.get.calledWith(AuthenticationServiceFactory).mockReturnValue(mockAuth);
  });

  it('should return map of rest open api registrations', () => {
    const entries = buildRestOpenApiRegistry(mockContext);

    expect(entries).toMatchObject({
      'test-application1': {
        application: {
          name: 'test-application1',
          context: 'test-contest-1',
          openApiConfig: {},
        },
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
      },
    });

    expect(entries['test-application1']?.registry.definitions).toIncludeAllMembers([
      {
        type: 'schema',
        schema: expect.anything(),
      },
      { type: 'component', componentType: 'schemas', name: 'schema2', component: { type: 'string' } },
    ]);
    expect(entries['test-application2']?.registry.definitions).toIncludeAllMembers([
      { component: { type: 'oauth2' }, componentType: 'securitySchemes', name: 'OAuth2', type: 'component' },
      {
        type: 'component',
        componentType: 'responses',
        name: 'response1',
        component: { description: 'Response1' },
      },
      {
        type: 'component',
        componentType: 'responses',
        name: 'response2',
        component: { description: 'Response2' },
      },
    ]);
  });

  it('should fail if authorisation schema is unknown', () => {
    mockAuth.getSecurityScheme.calledWith('OAuth2').mockReturnValue(undefined);

    expect(() => buildRestOpenApiRegistry(mockContext)).toThrowWithMessage(
      HttpControllerDefinitionError,
      'Unknown security scheme OAuth2. Check OpenAPI definition test-application2.',
    );
  });
});
