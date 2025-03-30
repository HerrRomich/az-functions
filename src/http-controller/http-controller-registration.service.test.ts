import { app } from '@azure/functions';
import { mock, MockProxy } from 'jest-mock-extended';
import { ControllerMetadata, ControllerOperationMetadata, HttpControllerMetadataService } from './decorators';
import { HttpControllerRegistrationService } from './http-controller-registration.service';
import { OpenAPIObjectConfig, RestApplication } from './http-controller.model';
import { HttpRequestHandlerProvider, RequestHandler } from './http-request-handler.provider';
import { OpenApiDefinitionService } from './open-api-definition.service';

jest.mock('@azure/functions');

class TestController {
  testGetRequest(): string {
    return 'get-response';
  }

  async testPostRequest() {
    const response = Promise.resolve('post-response');
    return await response;
  }
}

describe('HttpControllerPlatformService', () => {
  const testRestApplication: RestApplication = {
    name: 'test-application',
    context: 'rest-context',
    openApiConfig: {} as OpenAPIObjectConfig,
  };

  const testGetRequestOperationMetadata: ControllerOperationMetadata = {
    operationId: 'my-test-get-operation',
    path: 'test-get-request-path',
    method: 'get',
    args: [],
  };
  const testPostRequestOperationMetadata: ControllerOperationMetadata = {
    path: 'test-post-request-path',
    method: 'post',
    args: [],
  };
  const testControllerMetadata: ControllerMetadata = {
    type: 'http-controller',
    path: 'test-path',
    tags: ['tag1', 'tag2'],
    application: 'test-application',
  };

  const testController = new TestController();

  let getOperationRegistrationData: unknown;
  let mockGetRequest: MockProxy<RequestHandler>;

  let postOperationRegistrationData: unknown;
  let mockPostRequest: MockProxy<RequestHandler>;

  let mockOpenApiDefinitionService: MockProxy<OpenApiDefinitionService>;
  let mockHttpControllerMetadataService: MockProxy<HttpControllerMetadataService>;
  let mockRequestHandlerProvider: MockProxy<HttpRequestHandlerProvider>;
  let subject: HttpControllerRegistrationService;

  beforeEach(() => {
    mockHttpControllerMetadataService = mock();
    mockHttpControllerMetadataService.getOperationMetadata
      .calledWith(testController, 'testGetRequest')
      .mockReturnValue(testGetRequestOperationMetadata);
    mockHttpControllerMetadataService.getOperationMetadata
      .calledWith(testController, 'testPostRequest')
      .mockReturnValue(testPostRequestOperationMetadata);

    mockOpenApiDefinitionService = mock();
    mockOpenApiDefinitionService.getApplication
      .calledWith(testControllerMetadata.application)
      .mockReturnValue(testRestApplication);

    mockRequestHandlerProvider = mock();

    getOperationRegistrationData = {
      controller: testController,
      operation: 'testGetRequest',
      controllerMetadata: testControllerMetadata,
      operationMetadata: testGetRequestOperationMetadata,
      application: testRestApplication,
      route: 'test-path/test-get-request-path',
    };
    mockGetRequest = mock();
    mockRequestHandlerProvider.getHttpRequestHandler
      .calledWith(expect.objectContaining(getOperationRegistrationData), expect.anything())
      .mockReturnValue(mockGetRequest);

    postOperationRegistrationData = {
      controller: testController,
      operation: 'testPostRequest',
      controllerMetadata: testControllerMetadata,
      operationMetadata: testPostRequestOperationMetadata,
      application: testRestApplication,
      route: 'test-path/test-post-request-path',
    };
    mockPostRequest = mock();
    mockRequestHandlerProvider.getHttpRequestHandler
      .calledWith(expect.objectContaining(postOperationRegistrationData), expect.anything())
      .mockReturnValue(mockPostRequest);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('register in start mode', () => {
    beforeEach(() => {
      subject = new HttpControllerRegistrationService(
        'start',
        mockHttpControllerMetadataService,
        mockOpenApiDefinitionService,
        mockRequestHandlerProvider,
      );
    });

    it('should register trigger and provide swagger operation', async () => {
      subject.register(testController, testControllerMetadata);

      expect(mockRequestHandlerProvider.getHttpRequestHandler).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining(getOperationRegistrationData),
        expect.anything(),
      );
      expect(mockRequestHandlerProvider.getHttpRequestHandler).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining(postOperationRegistrationData),
        expect.anything(),
      );
      const getMethod = mockRequestHandlerProvider.getHttpRequestHandler.mock.calls[0]?.[1];
      expect(await getMethod?.()).toEqual('get-response');
      const postMethod = mockRequestHandlerProvider.getHttpRequestHandler.mock.calls[1]?.[1];
      expect(await postMethod?.()).toEqual('post-response');

      expect(app.http).toHaveBeenNthCalledWith(
        1,
        'my-test-get-operation',
        expect.objectContaining({
          route: 'rest-context/test-path/test-get-request-path',
          methods: ['GET'],
          handler: mockGetRequest,
        }),
      );
      expect(app.http).toHaveBeenNthCalledWith(
        2,
        'testPostRequest',
        expect.objectContaining({
          route: 'rest-context/test-path/test-post-request-path',
          methods: ['POST'],
          handler: mockPostRequest,
        }),
      );

      expect(mockOpenApiDefinitionService.registerOperation).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining(getOperationRegistrationData),
      );
      expect(mockOpenApiDefinitionService.registerOperation).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining(postOperationRegistrationData),
      );
    });
  });

  describe('register in print OpenAPI mode', () => {
    beforeEach(() => {
      subject = new HttpControllerRegistrationService(
        'print-open-api',
        mockHttpControllerMetadataService,
        mockOpenApiDefinitionService,
        mockRequestHandlerProvider,
      );
    });

    it('should only provide swagger operation', async () => {
      subject.register(testController, testControllerMetadata);

      expect(mockRequestHandlerProvider.getHttpRequestHandler).not.toHaveBeenCalled();

      expect(app.http).not.toHaveBeenCalled();

      expect(mockOpenApiDefinitionService.registerOperation).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining(getOperationRegistrationData),
      );
      expect(mockOpenApiDefinitionService.registerOperation).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining(postOperationRegistrationData),
      );
    });
  });
});
