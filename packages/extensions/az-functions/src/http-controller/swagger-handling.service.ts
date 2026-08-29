import { HttpRequest, HttpResponseInit } from '@azure/functions';
import { StatusCodes } from 'http-status-codes';
import { inject, injectable } from 'inversify';
import * as mime from 'mime-types';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { OpenAPIObject } from 'openapi3-ts/oas30';
import { BASE_DIR } from 'shared';
import { OpenApiDefinitionError, OpenApiDefinitionService } from './open-api-definition.service';

@injectable()
export class SwaggerHandlingService {
  constructor(
    @inject(BASE_DIR) private readonly baseDir: string,
    private readonly openApiDefinitionService: OpenApiDefinitionService,
  ) {}

  public async handleSwaggerContent(request: HttpRequest): Promise<HttpResponseInit> {
    const rawUrl = this.getOriginalUrl(request);
    const filename = request.params['fileName'];
    if (filename === undefined) {
      const divider = rawUrl.endsWith('/') ? '' : '/';
      return {
        status: StatusCodes.MOVED_TEMPORARILY,
        headers: {
          location: `${rawUrl}${divider}index.html`,
        },
      };
    }
    if (filename === 'swagger-initializer.js') {
      const definitions = this.openApiDefinitionService.getApplications();
      const primaryUrl = definitions[0] ?? '';
      const urls = definitions.map(definitionName => ({
        name: this.openApiDefinitionService.getApplication(definitionName).openApiConfig.info.title,
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
      return await this.serveSwaggerUi(filename);
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
    const rawUrl = this.getOriginalUrl(request);
    const url = new URL(rawUrl);
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
      if (e instanceof OpenApiDefinitionError) {
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

  private getOriginalUrl(request: HttpRequest) {
    return request.headers.get('x-ms-original-url') ?? request.url;
  }
}
