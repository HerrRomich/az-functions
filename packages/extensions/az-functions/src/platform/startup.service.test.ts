import { app } from '@azure/functions';
import { Container } from 'inversify';
import { mock, MockProxy } from 'jest-mock-extended';
import { IStartupService, registerStartupService, STARTUP_SERVICE } from './startup.service';

jest.mock('@azure/functions');

describe('Register StartupService', () => {
  describe('registerStartupService', () => {
    let mockContainer: MockProxy<Container>;

    beforeEach(() => {
      mockContainer = mock<Container>();
    });

    it('should not register startup hook if StartupService is not provided', () => {
      mockContainer.get.calledWith(STARTUP_SERVICE, { optional: true }).mockReturnValue(undefined);

      registerStartupService(mockContainer);

      expect(mockContainer.get).toHaveBeenCalledWith(STARTUP_SERVICE, { optional: true });
      expect(app.hook.appStart).not.toHaveBeenCalled();
    });

    it('should register startup hook if StartupService is provided', () => {
      const mockStartupService = mock<IStartupService>();
      mockContainer.get
        .calledWith(STARTUP_SERVICE, expect.objectContaining({ optional: true }))
        .mockReturnValue(mockStartupService);

      registerStartupService(mockContainer);

      expect(mockContainer.get).toHaveBeenCalledWith(STARTUP_SERVICE, { optional: true });
      expect(app.hook.appStart).toHaveBeenCalled();

      const appStartCallback = (app.hook.appStart as jest.Mock).mock.calls[0]![0];

      appStartCallback();

      expect(mockStartupService.startup).toHaveBeenCalled();
    });
  });
});
