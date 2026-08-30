import { mock, mockFn, MockProxy } from 'jest-mock-extended';
import { Logger } from 'logger';
import { TriggerHandlerMetadataError } from 'shared';
import { getPartialFixture } from 'test-utilities';
import { EventHubHandlerMetadata, EventHubTriggerMetadata } from './decorators/index';
import { EventHubHandlerMetadataReader } from './event-hub-handler-metadata.reader';
import { EventHubTriggersRegistrationService, RegisterCallback } from './event-hub-triggers-registration.service';

describe('EventhubTriggersRegistrationService', () => {
  let mockMetadataReader: MockProxy<EventHubHandlerMetadataReader>;
  let subject: EventHubTriggersRegistrationService;

  beforeEach(() => {
    mockMetadataReader = mock<EventHubHandlerMetadataReader>();
    subject = new EventHubTriggersRegistrationService(() => mock<Logger>(), mockMetadataReader);
  });

  describe('registerOperation', () => {
    class TestHandlerClass {
      testTriggerMethod1() {
        /* empty */
      }
      testTriggerMethod2() {
        /* empty */
      }
      testNonTriggerMethod() {
        /* empty */
      }
    }
    const testMetadata = getPartialFixture<EventHubHandlerMetadata>({});

    beforeEach(() => {
      mockMetadataReader.getHandlerClassMetadata.calledWith(TestHandlerClass).mockReturnValue(testMetadata);
    });

    it('should register trigger', () => {
      const testControllerOp1Metadata = getPartialFixture<EventHubTriggerMetadata>({
        triggerId: 'my-operation',
      });
      mockMetadataReader.getTriggerMetadata
        .calledWith(TestHandlerClass, 'testTriggerMethod1')
        .mockReturnValue(testControllerOp1Metadata);
      const testControllerOp2Metadata = getPartialFixture<EventHubTriggerMetadata>({});
      mockMetadataReader.getTriggerMetadata
        .calledWith(TestHandlerClass, 'testTriggerMethod2')
        .mockReturnValue(testControllerOp2Metadata);
      mockMetadataReader.getTriggerMetadata
        .calledWith(TestHandlerClass, 'testNonTriggerMethod')
        .mockImplementation(() => {
          throw new TriggerHandlerMetadataError('No trigger metadata found for method testNonTriggerMethod');
        });
      const mockRegisterCallBack = mockFn<RegisterCallback>();

      subject.registerTriggers(TestHandlerClass, mockRegisterCallBack);

      expect(mockMetadataReader.getHandlerClassMetadata).toHaveBeenCalledWith(TestHandlerClass);
      expect(mockMetadataReader.getTriggerMetadata).toHaveBeenCalledWith(TestHandlerClass, 'testTriggerMethod1');
      expect(mockMetadataReader.getTriggerMetadata).toHaveBeenCalledWith(TestHandlerClass, 'testTriggerMethod2');
      expect(mockRegisterCallBack).toHaveBeenCalledTimes(2);
      expect(mockRegisterCallBack).toHaveBeenCalledWith({
        triggerId: 'my-operation',
        handlerMetadata: testMetadata,
        triggerMetadata: testControllerOp1Metadata,
        triggerMethod: 'testTriggerMethod1',
      });
      expect(mockRegisterCallBack).toHaveBeenCalledWith({
        triggerId: 'testTriggerMethod2',
        handlerMetadata: testMetadata,
        triggerMetadata: testControllerOp2Metadata,
        triggerMethod: 'testTriggerMethod2',
      });
    });

    it('should throw if an error is thrown while getting trigger metadata', () => {
      const testError = new Error('Unexpected error while getting trigger metadata');
      mockMetadataReader.getTriggerMetadata
        .calledWith(TestHandlerClass, 'testTriggerMethod1')
        .mockImplementation(() => {
          throw testError;
        });
      const mockRegisterCallBack = mockFn<RegisterCallback>();

      expect(() => {
        subject.registerTriggers(TestHandlerClass, mockRegisterCallBack);
      }).toThrow(testError);
    });
  });
});
