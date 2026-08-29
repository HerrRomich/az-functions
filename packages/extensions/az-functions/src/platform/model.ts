import { RestApplication } from 'http-controller';
import { ContainerModule } from 'inversify';
import { LoggerConfiguration } from 'logger';
import { TriggerHandlerClass } from 'shared';

/**
 * Represents the configuration for the platform, including trigger handlers, REST applications, modules, and optional logger configuration.
 *
 * @property triggerHandlerClasses The trigger handler classes to be registered with the platform.
 * @property restApplications Optional REST applications to be registered with the platform.
 * @property modules The container modules to be loaded into the platform container.
 * @property loggerConfiguration Optional logger configuration for the platform.
 */
export interface PlatformConfiguration {
  triggerHandlerClasses: TriggerHandlerClass[];
  restApplications?: RestApplication[];
  modules: ContainerModule[];
  loggerConfiguration?: LoggerConfiguration;
}
