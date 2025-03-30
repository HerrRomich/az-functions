import { HttpRequest, HttpResponseInit } from '@azure/functions';
import * as fs from 'fs/promises';
import { StatusCodes } from 'http-status-codes';
import { inject, injectable } from 'inversify';
import * as mime from 'mime-types';
import { OpenAPIObject } from 'openapi3-ts/oas30';
import * as path from 'path';
import { BASE_DIR } from 'shared';
import { HttpControllerDefinitionError } from './http-controller-platform.model';
import { OpenApiDefinitionService } from './open-api-definition.service';

@injectable()
export class SwaggerHandlingService {
  constructor(
    @inject(BASE_DIR) private readonly baseDir: string,
    private readonly openApiDefinitionService: OpenApiDefinitionService,
  ) {}

  public async handleSwaggerContent(request: HttpRequest): Promise<HttpResponseInit> {
    const fileNme = request.params['fileName'] ?? 'index.html';
    if (fileNme === 'swagger-initializer.js') {
      const definitions = this.openApiDefinitionService.getApplications();
      const primaryUrl = definitions[0] ?? '';
      const urls = definitions.map(definitionName => ({
        name: this.openApiDefinitionService.getApplication(definitionName).openApiConfig.info.title ?? definitionName,
        url: `./definition/${definitionName}`,
      }));
      const body = `
window.onload = function () {
  const ui = SwaggerUIBundle({
    urls: ${JSON.stringify(urls)},
    'urls.primaryName': '${primaryUrl}',
    dom_id: '#swagger-ui',
    deepLinking: true,
    presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
    plugins: [SwaggerUIBundle.plugins.DownloadUrl],
    layout: 'StandaloneLayout',
  });

  ui.initOAuth({
    clientId: 'bbce1dad-9aae-47c4-938e-adba5dd812ce',
    scopes: 'user.read openid profile email offline_access',
  });

  window.ui = ui;
};
`;
      return {
        status: StatusCodes.OK,
        body: body,
        headers: {
          ContentType: 'application/javascript',
        },
      };
    } else {
      return await this.serveSwaggerUi(fileNme);
    }
  }

  private async serveSwaggerUi(fileName: string): Promise<HttpResponseInit> {
    const buffer = await fs.readFile(path.join(this.baseDir, 'assets/swagger-ui', fileName)).catch(() => undefined);
    if (!buffer) {
      return {
        status: StatusCodes.BAD_REQUEST,
        body: 'Path parameter is unknown',
      };
    }
    const contentType = mime.contentType(fileName);
    return {
      status: StatusCodes.OK,
      body: buffer,
      headers: {
        ContentType: contentType || 'application/octet-stream',
      },
    };
  }

  handleOpenApiDefinition(request: HttpRequest): HttpResponseInit {
    const url = new URL(request.url);
    const parts = url.pathname.split('/');
    const definitionNamePart = parts.pop();
    const definitionPart = parts.pop();
    const specPart = parts.pop();
    if (specPart !== 'spec' || definitionPart !== 'definition' || !definitionNamePart) {
      return {
        status: StatusCodes.BAD_REQUEST,
        body: 'Bad request for api definition.',
      };
    }
    let openAPIObject: OpenAPIObject;
    try {
      const apisUrl = `${url.origin}${parts.join('/')}`;
      openAPIObject = this.openApiDefinitionService.generateDocument(definitionNamePart, apisUrl);
    } catch (e: unknown) {
      if (e instanceof HttpControllerDefinitionError) {
        return {
          status: StatusCodes.NOT_FOUND,
          body: `Definition name=${definitionNamePart} is not found.`,
        };
      } else {
        return {
          status: StatusCodes.INTERNAL_SERVER_ERROR,
          body: `Cannot process definition name=${definitionNamePart}.`,
        };
      }
    }
    return {
      status: 200,
      jsonBody: openAPIObject,
    };
  }
}
