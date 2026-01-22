import { serviceIdentifier } from 'shared';

/**
 * Represents a service responsible for performing startup tasks.
 *
 * This interface defines a single method, `startup`, which is expected to be implemented by any class that provides startup functionality.
 * The `startup` method should return a Promise that resolves when the startup tasks are complete.
 *
 * @example
 * ```ts
 * @Injectable()
 * export class MyStartupService implements IStartupService {
 *   async startup(): Promise<void> {
 *     // Perform startup tasks here
 *   }
 * }
 * ...
 * export const StartupModule = new ContainerModule((bind) => {
 *   bind<IStartupService>(STARTUP_SERVICE).to(MyStartupService);
 * });
 * ...
 * startPlatform({
 * ...
 *   modules: [
 *   ...
 *    StartupModule,
 *   ...
 *   ],
 * ```
 */
export interface IStartupService {
  startup(): Promise<void>;
}

/**
 * A unique identifier for the `IStartupService` in the dependency injection container.
 * This identifier can be used to register and retrieve the startup service implementation.
 */
export const STARTUP_SERVICE = serviceIdentifier<IStartupService>('AzFunctions.StartupService');
