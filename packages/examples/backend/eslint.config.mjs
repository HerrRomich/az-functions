import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getGoogleConfig, provideConfig } from '../../../eslint.config.mjs';

const rootName = dirname(fileURLToPath(import.meta.url));

const config = [...provideConfig(), ...getGoogleConfig(rootName)];
export default config;
