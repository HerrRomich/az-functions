import { AZURE_FUNCTION, REST_APPLICATION } from '@herrromich/az-functions';
import { ContainerModule } from 'inversify';
import { CONSOLE_API_APPLICATION } from './console-api.application';
import { DashboardController } from './dashboard/dashboard.controller';
import { DashboardMapper } from './dashboard/dashboard.mapper';

export const consoleApiModule = new ContainerModule(({ bind }) => {
  bind(REST_APPLICATION).toConstantValue(CONSOLE_API_APPLICATION);

  bind(AZURE_FUNCTION).to(DashboardController);
  bind(DashboardMapper).toSelf();
});
