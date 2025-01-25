import { Container, interfaces } from 'inversify';
import { MockProxy, mock } from 'jest-mock-extended';
import { PLATFORM_CONTAINER } from 'shared';
import { z } from 'zod';
import { HttpControllerDefinitionError } from './http-controller-platform.model';
import { API_SCHEMA, ApiSchema, OpenAPIObjectConfig, REST_APPLICATION, RestApplication } from './http-controller.model';
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
        openapi: '3.0.0',
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
      refId: 'schema1',
      zodSchema: z.string(),
    } as ApiSchema,
    {
      refId: 'schema2',
      zodSchema: z.number(),
    } as ApiSchema,
  ];

  let mockAuth: MockProxy<AuthenticationServiceFactory>;
  let mockContainer: MockProxy<Container>;
  let mockPlatformContainer: MockProxy<Container>;
  let mockContext: MockProxy<interfaces.Context>;

  beforeEach(() => {
    mockAuth = mock();
    mockAuth.getSecurityScheme.calledWith('OAuth2').mockReturnValue({
      type: 'oauth2',
    });

    mockPlatformContainer = mock();
    mockPlatformContainer.isBound.calledWith(REST_APPLICATION).mockReturnValue(true);
    mockPlatformContainer.getAll.calledWith(REST_APPLICATION).mockReturnValue(testApplications);

    mockPlatformContainer.isBoundTagged
      .calledWith(API_SCHEMA, REST_APPLICATION, 'test-application1')
      .mockReturnValue(true);
    mockPlatformContainer.getAllTagged
      .calledWith(API_SCHEMA, REST_APPLICATION, 'test-application1')
      .mockReturnValue(testSchemaEntries);

    mockContainer = mock();
    mockContainer.get.calledWith(PLATFORM_CONTAINER).mockReturnValue(mockPlatformContainer);
    mockContainer.get.calledWith(AuthenticationServiceFactory).mockReturnValue(mockAuth);

    mockContext = mock();
    mockContext.container = mockContainer;
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
            openapi: '3.0.0',
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

    expect(entries['test-application1']?.registry.definitions).toContainAllValues([
      {
        type: 'schema',
        schema: expect.anything(),
      },
      {
        type: 'schema',
        schema: expect.anything(),
      },
    ]);
    expect(entries['test-application2']?.registry.definitions).toContainAllValues([
      { component: { type: 'oauth2' }, componentType: 'securitySchemes', name: 'OAuth2', type: 'component' },
    ]);
  });

  it('should fail if authorisation schema is unknown', () => {
    mockAuth.getSecurityScheme.calledWith('OAuth2').mockReturnValue(undefined);

    expect(() => buildRestOpenApiRegistry(mockContext)).toThrowWithMessage(
      HttpControllerDefinitionError,
      'Unknown security scheme OAuth2. Check OpenAPI definition test-application2.'
    );
  });
});
