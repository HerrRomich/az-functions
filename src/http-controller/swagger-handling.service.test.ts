import { HttpRequest } from '@azure/functions';
import * as fs from 'fs/promises';
import { DeepMockProxy, mock, mockDeep, MockProxy } from 'jest-mock-extended';
import { OpenAPIObject } from 'openapi3-ts/oas30';
import { HttpControllerDefinitionError } from './http-controller-platform.model';
import { OpenAPIObjectConfig, RestApplication } from './http-controller.model';
import { OpenApiDefinitionService } from './open-api-definition.service';
import { SwaggerHandlingService } from './swagger-handling.service';

jest.mock('fs/promises');

describe('SwaggerHandlingService', () => {
  let mockOpenApiDefinitionService: MockProxy<OpenApiDefinitionService>;
  let mockRequest: MockProxy<HttpRequest>;
  let mockOpenApiObject: DeepMockProxy<OpenAPIObject>;

  let subject: SwaggerHandlingService;

  beforeEach(() => {
    mockOpenApiDefinitionService = mock();
    mockOpenApiObject = mockDeep();

    subject = new SwaggerHandlingService('test-base-dir', mockOpenApiDefinitionService);
  });

  describe('handleOpenApiDefinition', () => {
    beforeEach(() => {
      mockRequest = mock<HttpRequest>({
        url: 'http://test.server.com/context/spec/definition/test-definition',
      });
    });

    it('should return api definition', () => {
      mockOpenApiDefinitionService.generateDocument
        .calledWith('test-definition', 'http://test.server.com/context')
        .mockReturnValue(mockOpenApiObject);

      const response = subject.handleOpenApiDefinition(mockRequest);

      expect(response).toMatchObject({
        status: 200,
        jsonBody: mockOpenApiObject,
      });
      expect(mockOpenApiDefinitionService.generateDocument).toHaveBeenCalledWith(
        'test-definition',
        'http://test.server.com/context',
      );
    });

    it.each([
      ["second part from end is not 'definition'", 'http://test.server.com/context/spec/error/test-definition'],
      ["second part from end is not 'spec'", 'http://test.server.com/context/error/definition/test-definition'],
    ])('should return bad request if %s', (_, url) => {
      mockRequest = mock<HttpRequest>({
        url,
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
        .calledWith('test-definition', 'http://test.server.com/context')
        .mockImplementation(() => {
          throw new HttpControllerDefinitionError();
        });

      const response = subject.handleOpenApiDefinition(mockRequest);

      expect(response).toMatchObject({
        status: 404,
        body: 'Definition name=test-definition is not found.',
      });
      expect(mockOpenApiDefinitionService.generateDocument).toHaveBeenCalledWith(
        'test-definition',
        'http://test.server.com/context',
      );
    });

    it('should return internal server error, if definition processed with error', () => {
      mockOpenApiDefinitionService.generateDocument
        .calledWith('test-definition', 'http://test.server.com/context')
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
        'http://test.server.com/context',
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
        } as unknown as OpenAPIObjectConfig,
        context: name,
      };
    }

    const mockFsReadFile = jest.mocked(fs.readFile);
    beforeEach(() => {
      mockRequest = mock();
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

    it('should return swagger UI content for index.html if no file name requested', async () => {
      mockFsReadFile.mockResolvedValue(Buffer.of());
      const response = await subject.handleSwaggerContent(mockRequest);

      expect(response).toMatchObject({
        headers: {
          ContentType: 'text/html; charset=utf-8',
        },
        status: 200,
      });
      expect(mockFsReadFile).toHaveBeenCalledWith('test-base-dir/assets/swagger-ui/index.html');
    });

    it('should return swagger UI content for known file', async () => {
      mockRequest.params['fileName'] = 'known-content.css';
      mockFsReadFile.mockResolvedValue(Buffer.of());
      const response = await subject.handleSwaggerContent(mockRequest);

      expect(response).toMatchObject({
        headers: {
          ContentType: 'text/css; charset=utf-8',
        },
        status: 200,
      });
      expect(mockFsReadFile).toHaveBeenCalledWith('test-base-dir/assets/swagger-ui/known-content.css');
    });

    it('should return not found for unknown file', async () => {
      mockRequest.params['fileName'] = 'unknown-content.unk';
      mockFsReadFile.mockRejectedValue(new Error('Error'));
      const response = await subject.handleSwaggerContent(mockRequest);

      expect(response).toMatchObject({
        body: 'Path parameter is unknown',
        status: 400,
      });
      expect(mockFsReadFile).toHaveBeenCalledWith('test-base-dir/assets/swagger-ui/unknown-content.unk');
    });
  });
});
