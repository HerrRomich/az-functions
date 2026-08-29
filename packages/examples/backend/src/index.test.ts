import { startPlatform } from '@herrromich/az-functions';
import { appConfigModule } from 'shared/app.config';
import { applicationCustomersModule } from 'shared/applications/customers';
import { applicationFleetModule } from 'shared/applications/fleet';
import { applicationOrdersModule } from 'shared/applications/orders';
import { loggerModule } from 'shared/logger';
import { persistenceModule } from 'shared/persistence/module';
import { securityModule } from 'shared/security';
import { startupModule } from 'shared/startup';
import { utilitiesModule } from 'shared/utils';
import { ConsoleRestModule, OrdersRestModule } from './interfaces/rest';
import { platformContainer } from './platform-container';

jest.mock('./platform-container', () => ({
  platformContainer: {
    load: jest.fn(),
  },
}));
jest.mock('@herrromich/az-functions', () => {
  const originalModule = jest.requireActual('@herrromich/az-functions');
  return {
    ...originalModule,
    startPlatform: jest.fn(),
  };
});

describe('start', () => {
  beforeAll(async () => {
    await import('.');
  });

  it('should load the platform container', () => {
    expect(platformContainer.load).toHaveBeenCalledWith(
      appConfigModule,
      persistenceModule,
      startupModule,
      securityModule,
      utilitiesModule,
      loggerModule,
      ConsoleRestModule,
      OrdersRestModule,
      applicationFleetModule,
      applicationOrdersModule,
      applicationCustomersModule,
    );
  });

  it('should start the platform', () => {
    expect(startPlatform).toHaveBeenCalledWith(platformContainer);
  });
});
