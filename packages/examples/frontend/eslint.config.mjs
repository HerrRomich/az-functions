import angular from 'angular-eslint';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { javascriptConfig, provideBaseConfig } from '../../../eslint.base.config.mjs';
const rootName = dirname(fileURLToPath(import.meta.url));

const config = [
  { ignores: ['node_modules/**', 'dist/**', 'coverage/**', 'generated/**', 'src/app/shared/apis/**'] },
  ...provideBaseConfig(),
  ...javascriptConfig,
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['**/*.spec.ts', '**/*.spec.tsx'],
    languageOptions: { parserOptions: { rootName, project: './tsconfig.app.json', sourceType: 'module' } },
    processor: angular.processInlineTemplates,
    plugins: { '@angular-eslint': angular.tsPlugin, '@angular-eslint/template': angular.templatePlugin },
    ...angular.configs.recommended,
    ...angular.configs['process-inline-templates'],
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'fs',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'fs',
          style: 'kebab-case',
        },
      ],
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.spec.tsx'],
    languageOptions: { parserOptions: { rootName, project: './tsconfig.spec.json', sourceType: 'module' } },
    plugins: { '@angular-eslint': angular.tsPlugin },
    ...angular.configs.recommended,
  },
  {
    files: ['**/*.html'],
    languageOptions: { parser: angular.templateParser },
    plugins: { '@angular-eslint/template': angular.templatePlugin },
    ...angular.configs.recommended,
  },
];
export default config;
