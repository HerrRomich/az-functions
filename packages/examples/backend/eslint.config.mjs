import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getGoogleConfig, getTypescriptConfig, provideBaseConfig } from '../../../eslint.base.config.mjs';

const rootName = dirname(fileURLToPath(import.meta.url));

const config = [
  { ignores: ['dist/**', 'coverage/**', 'generated/**'] },
  ...provideBaseConfig(),
  ...getGoogleConfig(rootName),
  ...getTypescriptConfig(rootName),
];
export default config;
