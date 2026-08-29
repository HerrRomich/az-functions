import { Injectable } from '@angular/core';
import { FleetSightConfig } from './config.model';

@Injectable()
export class FleetSightConfigService {
  private _config: FleetSightConfig | undefined;

  get config(): FleetSightConfig {
    if (this._config === undefined) {
      throw new Error('Config not loaded yet. Please call loadConfig() before accessing the config.');
    }
    return this._config;
  }

  async loadConfig(): Promise<void> {
    const resp = await fetch('/config.json');
    const config = (await resp.json()) as FleetSightConfig;
    config.APP_URL = window.location.origin;
    this._config = config;
  }
}
