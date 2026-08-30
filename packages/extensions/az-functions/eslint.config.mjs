import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getTypescriptConfig, provideBaseConfig } from '../../../eslint.base.config.mjs';

const rootName = dirname(fileURLToPath(import.meta.url));

const config = [
  { ignores: ['dist/**', 'coverage/**', 'generated/**'] },
  ...provideBaseConfig(),
  ...getTypescriptConfig(rootName),
  {
    files: ['src/test-utilities/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: path.resolve(rootName, 'tsconfig.test.json'),
      },
    },
  },
];
export default config;
