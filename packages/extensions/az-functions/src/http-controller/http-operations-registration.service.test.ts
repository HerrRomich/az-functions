import { mock, mockFn, MockProxy } from 'jest-mock-extended';
import { Logger } from 'logger';
import { TriggerHandlerMetadataError } from 'shared';
import { getPartialFixture } from 'test-utilities';
import { ControllerOperationMetadata, HttpControllerMetadata } from './decorators/index';
import { HttpControllerMetadataReader } from './http-controller-metadata.reader';
import { RestApplication } from './http-controller.model';
import { HttpOperationsRegistrationService, RegisterCallback } from './http-operations-registration.service';
import { OpenApiDefinitionService } from './open-api-definition.service';

describe('HttpOperationsRegistrationService', () => {
  let mockMetadataReader: MockProxy<HttpControllerMetadataReader>;
  let mockDefinitionService: MockProxy<OpenApiDefinitionService>;
  let subject: HttpOperationsRegistrationService;

  beforeEach(() => {
    mockMetadataReader = mock<HttpControllerMetadataReader>();
    mockDefinitionService = mock<OpenApiDefinitionService>();
    subject = new HttpOperationsRegistrationService(() => mock<Logger>(), mockMetadataReader, mockDefinitionService);
  });

  describe('registerOperation', () => {
    class TestControllerClass {
      testOperationMethod1() {
        /* empty */
      }
      testOperationMethod2() {
        /* empty */
      }
      testNonOperationMethod() {
        /* empty */
      }
    }

    const testMetadata = getPartialFixture<HttpControllerMetadata>({
      application: 'test-application',
      path: 'test-path',
    });

    beforeEach(() => {
      mockMetadataReader.getHandlerClassMetadata.calledWith(TestControllerClass).mockReturnValue(testMetadata);
    });

    it('should register operation and update OpenAPI definition', () => {
      const testControllerOp1Metadata = getPartialFixture<ControllerOperationMetadata>({
        operationId: 'my-operation',
      });
      mockMetadataReader.getOperationMetadata
        .calledWith(TestControllerClass, 'testOperationMethod1')
        .mockReturnValue(testControllerOp1Metadata);
      const testControllerOp2Metadata = getPartialFixture<ControllerOperationMetadata>({
        path: 'test-operation-path',
      });
      mockMetadataReader.getOperationMetadata
        .calledWith(TestControllerClass, 'testOperationMethod2')
        .mockReturnValue(testControllerOp2Metadata);
      mockMetadataReader.getOperationMetadata
        .calledWith(TestControllerClass, 'testNonOperationMethod')
        .mockImplementation(() => {
          throw new TriggerHandlerMetadataError('No operation metadata found for method testNonOperationMethod');
        });
      const testApplication = getPartialFixture<RestApplication>();
      mockDefinitionService.getApplication.calledWith('test-application').mockReturnValue(testApplication);
      const mockRegisterCallBack = mockFn<RegisterCallback>();

      subject.registerOperations(TestControllerClass, mockRegisterCallBack);

      expect(mockMetadataReader.getHandlerClassMetadata).toHaveBeenCalledWith(TestControllerClass);
      expect(mockMetadataReader.getOperationMetadata).toHaveBeenCalledWith(TestControllerClass, 'testOperationMethod1');
      expect(mockMetadataReader.getOperationMetadata).toHaveBeenCalledWith(TestControllerClass, 'testOperationMethod2');
      expect(mockDefinitionService.getApplication).toHaveBeenCalledWith('test-application');
      expect(mockRegisterCallBack).toHaveBeenCalledTimes(2);
      expect(mockRegisterCallBack).toHaveBeenCalledWith({
        application: testApplication,
        controllerMethod: 'testOperationMethod1',
        controllerMetadata: testMetadata,
        operationId: 'my-operation',
        operationMetadata: testControllerOp1Metadata,
        route: 'test-path',
      });
      expect(mockRegisterCallBack).toHaveBeenCalledWith({
        application: testApplication,
        controllerMethod: 'testOperationMethod2',
        controllerMetadata: testMetadata,
        operationId: 'testOperationMethod2',
        operationMetadata: testControllerOp2Metadata,
        route: 'test-path/test-operation-path',
      });
    });

    it('should throw if an error is thrown while getting operation metadata', () => {
      const testError = new Error('Unexpected error while getting operation metadata');
      mockMetadataReader.getOperationMetadata
        .calledWith(TestControllerClass, 'testOperationMethod1')
        .mockImplementation(() => {
          throw testError;
        });
      const mockRegisterCallBack = mockFn<RegisterCallback>();

      expect(() => {
        subject.registerOperations(TestControllerClass, mockRegisterCallBack);
      }).toThrow(testError);
    });
  });
});
