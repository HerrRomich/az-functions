import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { Container, interfaces } from 'inversify';
import { PLATFORM_CONTAINER } from 'shared';
import { HttpControllerDefinitionError } from './http-controller-platform.model';
import { API_SCHEMA, ApiSchema, REST_APPLICATION, RestApplication } from './http-controller.model';
import { AuthenticationServiceFactory } from './security';

export interface RestOpenApiEntry {
  application: RestApplication;
  registry: OpenAPIRegistry;
}
export type RestOpenApiEntries = Record<string, RestOpenApiEntry>;

export const REST_OPEN_API_REGISTRY = Symbol.for('REST_OPEN_API_REGISTRY');

export function buildRestOpenApiRegistry(context: interfaces.Context): RestOpenApiEntries {
  const authorizationServiceFactory = context.container.get(AuthenticationServiceFactory);
  const platformContainer: Container = context.container.get(PLATFORM_CONTAINER);
  const restApplications = platformContainer.isBound(REST_APPLICATION)
    ? platformContainer.getAll<RestApplication>(REST_APPLICATION)
    : [];
  return restApplications.reduce<RestOpenApiEntries>((data, application) => {
    const registry = new OpenAPIRegistry();
    application.openApiConfig.security?.forEach((requirement) => {
      for (const scheme in requirement) {
        const securityScheme = authorizationServiceFactory.getSecurityScheme(scheme);
        if (!securityScheme) {
          throw new HttpControllerDefinitionError(
            `Unknown security scheme ${scheme}. Check OpenAPI definition ${application.name}.`
          );
        }
        registry.registerComponent('securitySchemes', scheme, securityScheme);
      }
    });
    if (platformContainer.isBoundTagged(API_SCHEMA, REST_APPLICATION, application.name)) {
      platformContainer
        .getAllTagged<ApiSchema>(API_SCHEMA, REST_APPLICATION, application.name)
        .forEach(({ refId, zodSchema }) => {
          registry.register(refId, zodSchema);
        });
    }
    return {
      ...data,
      [application.name]: { application, registry },
    };
  }, {});
}
