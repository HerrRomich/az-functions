import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { Container, ResolutionContext } from 'inversify';
import { PLATFORM_CONTAINER } from 'shared';
import { HttpControllerDefinitionError } from './http-controller-platform.model';
import {
  API_RESPONSE,
  API_SCHEMA,
  ApiResponse,
  ApiSchema,
  REST_APPLICATION,
  RestApplication,
} from './http-controller.model';
import { AuthenticationServiceFactory } from './security';
import { ZodType } from 'zod';

export interface RestOpenApiEntry {
  application: RestApplication;
  registry: OpenAPIRegistry;
}
export type RestOpenApiEntries = Record<string, RestOpenApiEntry>;

export const REST_OPEN_API_REGISTRY = Symbol.for('REST_OPEN_API_REGISTRY');

export function buildRestOpenApiRegistry(context: ResolutionContext): RestOpenApiEntries {
  const authorizationServiceFactory = context.get(AuthenticationServiceFactory);
  const platformContainer: Container = context.get(PLATFORM_CONTAINER);
  const restApplications = platformContainer.getAll<RestApplication>(REST_APPLICATION);
  return restApplications.reduce<RestOpenApiEntries>((data, application) => {
    const registry = new OpenAPIRegistry();
    application.openApiConfig.security?.forEach(requirement => {
      for (const scheme in requirement) {
        const securityScheme = authorizationServiceFactory.getSecurityScheme(scheme);
        if (!securityScheme) {
          throw new HttpControllerDefinitionError(
            `Unknown security scheme ${scheme}. Check OpenAPI definition ${application.name}.`,
          );
        }
        registry.registerComponent('securitySchemes', scheme, securityScheme);
      }
    });
    platformContainer
      .getAll<ApiSchema>(API_SCHEMA, { tag: { key: REST_APPLICATION, value: application.name } })
      .forEach(({ name, schema }) => {
        if (schema instanceof ZodType) {
          registry.register(name, schema);
        } else {
          registry.registerComponent('schemas', name, schema);
        }
      });
    platformContainer
      .getAll<ApiResponse>(API_RESPONSE, { tag: { key: REST_APPLICATION, value: application.name } })
      .forEach(({ name, response }) => {
        registry.registerComponent('responses', name, response);
      });
    return {
      ...data,
      [application.name]: { application, registry },
    };
  }, {});
}
