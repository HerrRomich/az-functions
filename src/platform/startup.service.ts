export const STARTUP_SERVICE = Symbol.for('STARTUP_SERVICE');

export interface StartupService {
  startup(): Promise<void>;
}
