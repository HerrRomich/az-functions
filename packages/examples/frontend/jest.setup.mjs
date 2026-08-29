import { setupZonelessTestEnv } from 'jest-preset-angular/setup-env/zoneless';

// Increase timeout to 30 seconds to allow the Azure functions to spin up.

setupZonelessTestEnv();
jest.setTimeout(30 * 1000);
