import { HttpRequest } from '@azure/functions';
import { DeepMockProxy, mock, mockDeep, MockProxy } from 'jest-mock-extended';
import * as fs from 'node:fs/promises';
import { OpenAPIObject } from 'openapi3-ts/oas30';
import { PartialDeep } from 'type-fest';
import { OpenAPIObjectConfig, RestApplication } from './http-controller.model';
import { OpenApiDefinitionError, OpenApiDefinitionService } from './open-api-definition.service';
import { SwaggerHandlingService } from './swagger-handling.service';

jest.mock('node:fs/promises');

describe('SwaggerHandlingService', () => {
  const testRequestedUrl = 'http://test.server.com/context/spec/definition/test-definition';
  const testOriginalUrl = 'http://original-test.server.com/context/spec/definition/test-definition';
  let mockOpenApiDefinitionService: MockProxy<OpenApiDefinitionService>;
  let mockHeaders: MockProxy<Headers>;
  let mockRequest: MockProxy<HttpRequest>;
  let mockOpenApiObject: DeepMockProxy<OpenAPIObject>;

  let subject: SwaggerHandlingService;

  beforeEach(() => {
    mockHeaders = mock<Headers>();
    mockHeaders.get.calledWith('x-ms-original-url').mockReturnValue(testOriginalUrl);

    mockOpenApiDefinitionService = mock();
    mockOpenApiObject = mockDeep();

    subject = new SwaggerHandlingService('test-base-dir', mockOpenApiDefinitionService);
  });

  describe('handleOpenApiDefinition', () => {
    beforeEach(() => {
      mockRequest = mock<HttpRequest>({
        url: testRequestedUrl,
        headers: mockHeaders,
      });
    });

    it('should return api definition', () => {
      mockOpenApiDefinitionService.generateDocument
        .calledWith('test-definition', 'http://original-test.server.com/context')
        .mockReturnValue(mockOpenApiObject);

      const response = subject.handleOpenApiDefinition(mockRequest);

      expect(response).toMatchObject({
        status: 200,
        jsonBody: mockOpenApiObject,
      });
      expect(mockOpenApiDefinitionService.generateDocument).toHaveBeenCalledWith(
        'test-definition',
        'http://original-test.server.com/context',
      );
      expect(mockHeaders.get).toHaveBeenCalledWith('x-ms-original-url');
    });

    it.each<{ title: string; url: string }>([
      {
        title: "second part from end is not 'definition'",
        url: 'http://test-original.server.com/context/spec/error/test-definition',
      },
      {
        title: "second part from end is not 'spec'",
        url: 'http://test-original.server.com/context/error/definition/test-definition',
      },
    ])('should return bad request if $title', ({ url }) => {
      mockHeaders.get.calledWith('x-ms-original-url').mockReturnValue(url);
      mockRequest = mock<HttpRequest>({
        headers: mockHeaders,
      });
      const response = subject.handleOpenApiDefinition(mockRequest);

      expect(response).toMatchObject({
        status: 400,
        body: 'Bad request for api definition.',
      });
      expect(mockOpenApiDefinitionService.generateDocument).not.toHaveBeenCalled();
    });

    it('should return not found for unknown definition', () => {
      mockOpenApiDefinitionService.generateDocument
        .calledWith('test-definition', 'http://original-test.server.com/context')
        .mockImplementation(() => {
          throw new OpenApiDefinitionError();
        });

      const response = subject.handleOpenApiDefinition(mockRequest);

      expect(response).toMatchObject({
        status: 404,
        body: 'Definition name=test-definition is not found.',
      });
      expect(mockOpenApiDefinitionService.generateDocument).toHaveBeenCalledWith(
        'test-definition',
        'http://original-test.server.com/context',
      );
    });

    it('should return internal server error, if definition processed with error', () => {
      mockOpenApiDefinitionService.generateDocument
        .calledWith('test-definition', 'http://original-test.server.com/context')
        .mockImplementation(() => {
          throw new Error();
        });

      const response = subject.handleOpenApiDefinition(mockRequest);

      expect(response).toMatchObject({
        status: 500,
        body: 'Cannot process definition name=test-definition.',
      });
      expect(mockOpenApiDefinitionService.generateDocument).toHaveBeenCalledWith(
        'test-definition',
        'http://original-test.server.com/context',
      );
    });
  });

  describe('handleSwaggerContent', () => {
    function getApplication(name: string, title: string): RestApplication {
      return {
        name,
        openApiConfig: {
          info: {
            title,
          },
        } as PartialDeep<OpenAPIObjectConfig> as OpenAPIObjectConfig,
        context: name,
      };
    }

    const mockFsReadFile = jest.mocked(fs.readFile);
    beforeEach(() => {
      mockRequest = mock<HttpRequest>({
        url: testRequestedUrl,
        headers: mockHeaders,
      });
    });

    it('should return swagger-initializer.js for requested fileName param', async () => {
      mockRequest.params['fileName'] = 'swagger-initializer.js';
      mockOpenApiDefinitionService.getApplications.mockReturnValue(['application1', 'application2']);
      mockOpenApiDefinitionService.getApplication
        .calledWith('application1')
        .mockReturnValue(getApplication('application1', 'Application 1'));
      mockOpenApiDefinitionService.getApplication
        .calledWith('application2')
        .mockReturnValue(getApplication('application2', 'Application 2'));

      const response = await subject.handleSwaggerContent(mockRequest);

      expect(response).toMatchObject({
        body: expect.stringContaining(
          'urls: [{"name":"Application 1","url":"./definition/application1"},{"name":"Application 2","url":"./definition/application2"}],',
        ),
        headers: {
          ContentType: 'application/javascript',
        },
        status: 200,
      });
    });

    describe('redirect to index.html', () => {
      it('should redirect to "original" index.html if no fileName param is provided', async () => {
        mockFsReadFile.mockResolvedValue(Buffer.of());
        const response = await subject.handleSwaggerContent(mockRequest);

        expect(response).toMatchObject({
          headers: {
            location: 'http://original-test.server.com/context/spec/definition/test-definition/index.html',
          },
          status: 302,
        });
        expect(mockFsReadFile).not.toHaveBeenCalled();
      });

      it('should redirect to "original" index.html if no fileName param is provided and x-ms-original-url header is present with trailing slash', async () => {
        mockHeaders.get.calledWith('x-ms-original-url').mockReturnValue(testOriginalUrl + '/');

        mockFsReadFile.mockResolvedValue(Buffer.of());
        const response = await subject.handleSwaggerContent(mockRequest);

        expect(response).toMatchObject({
          headers: {
            location: 'http://original-test.server.com/context/spec/definition/test-definition/index.html',
          },
          status: 302,
        });
        expect(mockFsReadFile).not.toHaveBeenCalled();
      });

      it('should redirect to "requested" index.html if no fileName param is provided and no x-ms-original-url header is present', async () => {
        mockHeaders.get.calledWith('x-ms-original-url').mockReturnValue(null);
        mockFsReadFile.mockResolvedValue(Buffer.of());
        const response = await subject.handleSwaggerContent(mockRequest);

        expect(response).toMatchObject({
          headers: {
            location: 'http://test.server.com/context/spec/definition/test-definition/index.html',
          },
          status: 302,
        });
        expect(mockFsReadFile).not.toHaveBeenCalled();
      });
    });

    it('should return swagger UI jsonContent for known file', async () => {
      mockRequest.params['fileName'] = 'known-jsonContent.css';
      mockFsReadFile.mockResolvedValue(Buffer.of());
      const response = await subject.handleSwaggerContent(mockRequest);

      expect(response).toMatchObject({
        headers: {
          ContentType: 'text/css; charset=utf-8',
        },
        status: 200,
      });
      expect(mockFsReadFile).toHaveBeenCalledWith('test-base-dir/assets/swagger-ui/known-jsonContent.css');
    });

    it('should return not found for unknown file', async () => {
      mockRequest.params['fileName'] = 'unknown-jsonContent.unk';
      mockFsReadFile.mockRejectedValue(new Error('Error'));
      const response = await subject.handleSwaggerContent(mockRequest);

      expect(response).toMatchObject({
        body: 'Path parameter is unknown',
        status: 400,
      });
      expect(mockFsReadFile).toHaveBeenCalledWith('test-base-dir/assets/swagger-ui/unknown-jsonContent.unk');
    });

    it('should return empty primary url if no definitions are available', async () => {
      mockRequest.params['fileName'] = 'swagger-initializer.js';
      mockOpenApiDefinitionService.getApplications.mockReturnValue([]);

      const response = await subject.handleSwaggerContent(mockRequest);

      expect(response).toMatchObject({
        body: expect.stringContaining("urls: [],\n    'urls.primaryName': '',"),
        headers: {
          ContentType: 'application/javascript',
        },
        status: 200,
      });
    });

    it('should return application/octet-stream for unknown mime type', async () => {
      mockRequest.params['fileName'] = 'file.unknownext';
      mockFsReadFile.mockResolvedValue(Buffer.of());
      const response = await subject.handleSwaggerContent(mockRequest);

      expect(response).toMatchObject({
        headers: {
          ContentType: 'application/octet-stream',
        },
        status: 200,
      });
      expect(mockFsReadFile).toHaveBeenCalledWith('test-base-dir/assets/swagger-ui/file.unknownext');
    });
  });
});
