import { ResolutionContext } from 'inversify';
import { mock, MockProxy } from 'jest-mock-extended';
import { EventHubHandlerRegistrationService } from '../event-hub-handler/event-hub-handler-registration.service';
import { HttpControllerRegistrationService } from '../http-controller';
import { RegisterFunctionFactory, registerFunctionFactory } from './register-function.factory';

describe('registerFunctionFactory', () => {
  let factory: RegisterFunctionFactory;
  let mockContext: MockProxy<ResolutionContext>;
  let mockHttpRegistrationService: MockProxy<HttpControllerRegistrationService>;
  let mockEventHubRegistrationService: MockProxy<EventHubHandlerRegistrationService>;

  beforeEach(() => {
    mockContext = mock();
    factory = registerFunctionFactory(mockContext);
    mockHttpRegistrationService = mock();
    mockContext.get.calledWith(HttpControllerRegistrationService).mockReturnValue(mockHttpRegistrationService);
    mockEventHubRegistrationService = mock();
    mockContext.get.calledWith(EventHubHandlerRegistrationService).mockReturnValue(mockEventHubRegistrationService);
  });

  it('should return HttpControllerRegistrationService', () => {
    expect(factory('http-controller')).toEqual(mockHttpRegistrationService);
  });

  it('should return EventHubRegistrationService', () => {
    expect(factory('event-hub-handler')).toEqual(mockEventHubRegistrationService);
  });
});
