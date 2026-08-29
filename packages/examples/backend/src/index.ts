import { OtelConfiguration, startPlatform } from '@herrromich/az-functions';

import './init';

import { EventHubHandlers } from '@fleet-sight/interfaces/event-hub/index';
import { ConsoleRestModule, HttpControllers, OrdersRestModule, RestApplications } from '@fleet-sight/interfaces/rest';
import { AppConfigModule } from '@fleet-sight/shared/app-config';
import { ApplicationCustomersModule } from '@fleet-sight/shared/applications/customers';
import { ApplicationFleetModule } from '@fleet-sight/shared/applications/fleet';
import { ApplicationOrdersModule } from '@fleet-sight/shared/applications/orders';
import { EventHubModule } from '@fleet-sight/shared/event-nub/index';
import { LoggerModule } from '@fleet-sight/shared/logger';
import { PersistenceModule } from '@fleet-sight/shared/persistence/module';
import { RedisModule } from '@fleet-sight/shared/redis';
import { SecurityModule } from '@fleet-sight/shared/security';
import { StartupModule } from '@fleet-sight/shared/startup';
import { UtilitiesModule } from '@fleet-sight/shared/utils';

const otelConfiguration: OtelConfiguration | undefined =
  process.env.APPLICATIONINSIGHTS_CONNECTION_STRING !== undefined
    ? {
        applicationInsightsConnectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
        serviceName: process.env.WEBSITE_DEPLOYMENT_ID,
        serviceVersion: '1.0.0',
        serviceInstanceId: process.env.WEBSITE_INSTANCE_ID,
      }
    : undefined;

startPlatform({
  triggerHandlerClasses: [...HttpControllers, ...EventHubHandlers],
  restApplications: [...RestApplications],
  modules: [
    AppConfigModule,
    PersistenceModule,
    StartupModule,
    SecurityModule,
    UtilitiesModule,
    LoggerModule,
    RedisModule,
    EventHubModule,

    // API modules
    ConsoleRestModule,
    OrdersRestModule,

    // application modules
    ApplicationFleetModule,
    ApplicationOrdersModule,
    ApplicationCustomersModule,
  ],
  loggerConfiguration: {
    otelConfiguration,
  },
});
