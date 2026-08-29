import { getPartialFixture } from '@utilities/test-utilities';
import { mock, MockProxy } from 'jest-mock-extended';
import { Logger } from 'logger';
import { TriggerHandlerClass, TriggerHandlerClassMetadata, TriggerHandlerMetadataReader } from 'shared';
import { RestApplication } from './http-controller.model';
import { HttpOperationRegistration, HttpOperationsRegistrationService } from './http-operations-registration.service';
import { OpenApiDefinitionService } from './open-api-definition.service';
import { OpenApiRegistrationService } from './open-api-registration.service';

class TestHttpTriggerHandler1 {}
class TestHttpTriggerHandler2 {}
class TestNonHttpTriggerHandler {}

describe('OpenApiRegistrationService', () => {
  const testHandlerClasses: TriggerHandlerClass[] = [
    TestHttpTriggerHandler1,
    TestHttpTriggerHandler2,
    TestNonHttpTriggerHandler,
  ];
  const testRestApplications: RestApplication[] = [
    getPartialFixture<RestApplication>({ name: 'test-rest-application1' }),
    getPartialFixture<RestApplication>({ name: 'test-rest-application2' }),
  ];

  let mockMetadataReader: MockProxy<TriggerHandlerMetadataReader>;
  let mockDefinitionService: MockProxy<OpenApiDefinitionService>;
  let mockRegistrationService: MockProxy<HttpOperationsRegistrationService>;
  let subject: OpenApiRegistrationService;

  beforeEach(() => {
    mockMetadataReader = mock<TriggerHandlerMetadataReader>();
    mockMetadataReader.getHandlerClassMetadata.mockImplementation(triggerHandlerClass => {
      if (triggerHandlerClass === TestNonHttpTriggerHandler) {
        return getPartialFixture<TriggerHandlerClassMetadata>({ type: 'non-http' });
      }
      return getPartialFixture<TriggerHandlerClassMetadata>({ type: 'http-controller' });
    });
    mockDefinitionService = mock<OpenApiDefinitionService>();
    mockRegistrationService = mock<HttpOperationsRegistrationService>();

    subject = new OpenApiRegistrationService(mockMetadataReader, mockDefinitionService, mockRegistrationService, () =>
      mock<Logger>(),
    );
  });

  it('should register OpenAPI definitions for HTTP trigger handler classes', () => {
    subject.register({
      triggerHandlerClasses: testHandlerClasses,
      restApplications: testRestApplications,
    });

    expect(mockMetadataReader.getHandlerClassMetadata).toHaveBeenCalledTimes(testHandlerClasses.length);
    expect(mockMetadataReader.getHandlerClassMetadata).toHaveBeenCalledWith(TestHttpTriggerHandler1);
    expect(mockMetadataReader.getHandlerClassMetadata).toHaveBeenCalledWith(TestHttpTriggerHandler2);
    expect(mockMetadataReader.getHandlerClassMetadata).toHaveBeenCalledWith(TestNonHttpTriggerHandler);

    expect(mockDefinitionService.addApplication).toHaveBeenCalledTimes(testRestApplications.length);
    expect(mockDefinitionService.addApplication).toHaveBeenCalledWith(testRestApplications[0]);
    expect(mockDefinitionService.addApplication).toHaveBeenCalledWith(testRestApplications[1]);

    expect(mockRegistrationService.registerOperations).toHaveBeenCalledTimes(2);
    expect(mockRegistrationService.registerOperations).toHaveBeenCalledWith(
      TestHttpTriggerHandler1,
      expect.any(Function),
    );
    const regOperationsCallback1 = mockRegistrationService.registerOperations.mock.calls[0]![1];
    const testRegistration1 = getPartialFixture<HttpOperationRegistration>();
    regOperationsCallback1(testRegistration1);
    expect(mockDefinitionService.registerOperation).toHaveBeenCalledWith(testRegistration1);
    expect(mockRegistrationService.registerOperations).toHaveBeenCalledWith(
      TestHttpTriggerHandler2,
      expect.any(Function),
    );
    const regOperationsCallback2 = mockRegistrationService.registerOperations.mock.calls[1]![1];
    const testRegistration2 = getPartialFixture<HttpOperationRegistration>();
    regOperationsCallback2(testRegistration2);
    expect(mockDefinitionService.registerOperation).toHaveBeenCalledWith(testRegistration2);
  });

  it('should register OpenAPI definitions for HTTP trigger handler classes without restApplications', () => {
    subject.register({
      triggerHandlerClasses: testHandlerClasses,
    });

    expect(mockMetadataReader.getHandlerClassMetadata).toHaveBeenCalledTimes(testHandlerClasses.length);
    expect(mockMetadataReader.getHandlerClassMetadata).toHaveBeenCalledWith(TestHttpTriggerHandler1);
    expect(mockMetadataReader.getHandlerClassMetadata).toHaveBeenCalledWith(TestHttpTriggerHandler2);
    expect(mockMetadataReader.getHandlerClassMetadata).toHaveBeenCalledWith(TestNonHttpTriggerHandler);

    expect(mockDefinitionService.addApplication).not.toHaveBeenCalled();

    expect(mockRegistrationService.registerOperations).toHaveBeenCalledTimes(2);
    expect(mockRegistrationService.registerOperations).toHaveBeenCalledWith(
      TestHttpTriggerHandler1,
      expect.any(Function),
    );
    const regOperationsCallback1 = mockRegistrationService.registerOperations.mock.calls[0]![1];
    const testRegistration1 = getPartialFixture<HttpOperationRegistration>();
    regOperationsCallback1(testRegistration1);
    expect(mockDefinitionService.registerOperation).toHaveBeenCalledWith(testRegistration1);
    expect(mockRegistrationService.registerOperations).toHaveBeenCalledWith(
      TestHttpTriggerHandler2,
      expect.any(Function),
    );
    const regOperationsCallback2 = mockRegistrationService.registerOperations.mock.calls[1]![1];
    const testRegistration2 = getPartialFixture<HttpOperationRegistration>();
    regOperationsCallback2(testRegistration2);
    expect(mockDefinitionService.registerOperation).toHaveBeenCalledWith(testRegistration2);
  });
});
