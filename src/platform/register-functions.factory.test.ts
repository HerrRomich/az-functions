import { Container, interfaces } from 'inversify';
import { MockProxy, mock } from 'jest-mock-extended';
import { EventHubHandlersRegistrationService } from '../event-hub-handler/event-hub-handlers-registration.service';
import { HttpControllerRegistrationService } from '../http-controller';
import { RegisterFunctionFactory, registerFunctionsFactory } from './register-functions.factory';

describe('registerFunctionsFactory', () => {
  let factory: RegisterFunctionFactory;
  let mockContext: MockProxy<interfaces.Context>;
  let mockContainer: MockProxy<Container>;
  let mockHttpRegistrationService: MockProxy<HttpControllerRegistrationService>;
  let mockEventHubRegistrationService: MockProxy<EventHubHandlersRegistrationService>;

  beforeEach(() => {
    mockContainer = mock();
    mockContext = mock();
    mockContext.container = mockContainer;
    factory = registerFunctionsFactory(mockContext);
    mockHttpRegistrationService = mock();
    mockContainer.get.calledWith(HttpControllerRegistrationService).mockReturnValue(mockHttpRegistrationService);
    mockEventHubRegistrationService = mock();
    mockContainer.get.calledWith(EventHubHandlersRegistrationService).mockReturnValue(mockEventHubRegistrationService);
  });

  it('should return HttpControllerRegistrationService', () => {
    expect(factory('http-controller')).toEqual(mockHttpRegistrationService);
  });

  it('should return HttpControllerRegistrationService', () => {
    expect(factory('event-hub-handlers')).toEqual(mockEventHubRegistrationService);
  });
});
