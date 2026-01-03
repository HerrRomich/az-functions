import { FlatCompat } from '@eslint/eslintrc';
import eslintJavascript from '@eslint/js';
import eslintPluginJson from 'eslint-plugin-json';
import eslintPluginPrettier from 'eslint-plugin-prettier/recommended';
import eslintPluginSonar from 'eslint-plugin-sonarjs';
import globals from 'globals';
import eslintGoogleConfig from 'gts';

import path from 'node:path';
import { loadConfig } from 'tsconfig-paths';
import eslintTypescript from 'typescript-eslint';

export const javascriptConfig = [
  {
    files: ['**/*.js', '**/*.mjs'],
    ...eslintJavascript.configs.recommended,
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
      },
    },
  },
];

export function getTypeScriptPathsRules(rootName) {
  const tsConfig = rootName ? loadConfig(rootName) : undefined;
  const paths = Object.keys(tsConfig.paths ?? {}).map(path => path.replace(/\/\*$/, ''));
  return {
    'n/no-extraneous-import': [
      'error',
      {
        allowModules: [...paths],
      },
    ],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'sonarjs/function-return-type': 'off',
  };
}

export function getGoogleConfig(rootName) {
  const compat = new FlatCompat({
    baseDirectory: rootName,
    recommendedConfig: eslintJavascript.configs.recommended,
  });
  return compat.config(eslintGoogleConfig);
}

export function getTypescriptConfig(rootName, tsConfigName = 'tsconfig.json', tsTestConfigName = 'tsconfig.test.json') {
  const fullConfigName = path.resolve(rootName, tsConfigName);
  const fullTestConfigName = path.resolve(rootName, tsTestConfigName);
  return [
    ...eslintTypescript.configs.stylistic,
    {
      files: ['**/*.ts', '**/*.tsx'],
      ignores: ['**/*.test.ts', '**/*.test.tsx'],
      languageOptions: {
        parserOptions: {
          rootName,
          project: fullConfigName,
        },
      },
      rules: getTypeScriptPathsRules(rootName),
    },
    {
      files: ['**/*.test.ts', '**/*.test.tsx'],
      languageOptions: {
        parserOptions: {
          rootName,
          project: fullTestConfigName,
        },
      },
      rules: {
        ...getTypeScriptPathsRules(rootName),
        '@typescript-eslint/no-explicit-any': 'off',
        'sonarjs/no-nested-functions': 'off',
        'sonarjs/no-clear-text-protocols': 'off',
      },
    },
  ];
}

export function provideBaseConfig() {
  const jsonConfig = [eslintPluginJson.configs['recommended-with-comments']];

  const sonarConfigRecommended = {
    ignores: ['**/*.json'],
    ...eslintPluginSonar.configs.recommended,
  };
  return [sonarConfigRecommended, eslintPluginPrettier, ...javascriptConfig, ...jsonConfig];
}
