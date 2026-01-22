import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getTypescriptConfig, javascriptConfig, provideBaseConfig } from '../../../eslint.base.config.mjs';

const rootName = dirname(fileURLToPath(import.meta.url));

const config = [
  { ignores: ['dist/**', 'coverage/**', 'generated/**'] },
  ...javascriptConfig,
  ...provideBaseConfig(),
  ...getTypescriptConfig(rootName),
];
export default config;
