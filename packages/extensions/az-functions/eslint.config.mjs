import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getGoogleConfig, getTypescriptConfig, provideConfig } from '../../../eslint.config.mjs';

const rootName = dirname(fileURLToPath(import.meta.url));

const config = [
  { ignores: ['dist/**', 'coverage/**', 'generated/**'] },
  ...provideConfig(),
  ...getGoogleConfig(rootName),
  ...getTypescriptConfig(rootName),
];
export default config;
