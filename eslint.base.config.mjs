import eslintJavascript from '@eslint/js';
import eslintPluginJson from 'eslint-plugin-json';
import esLintPluginN from 'eslint-plugin-n';
import eslintPluginPrettier from 'eslint-plugin-prettier/recommended';
import eslintPluginSonar from 'eslint-plugin-sonarjs';
import globals from 'globals';
import * as jsoncParser from 'jsonc-eslint-parser';

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
    'prettier/prettier': 'error',
    'block-scoped-var': 'error',
    'eqeqeq': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    'eol-last': 'error',
    'prefer-arrow-callback': 'error',
    'no-trailing-spaces': 'error',
    'quotes': ['warn', 'single', { avoidEscape: true }],
    'no-restricted-properties': [
      'error',
      {
        object: 'describe',
        property: 'only',
      },
      {
        object: 'it',
        property: 'only',
      },
    ],
    'n/no-extraneous-import': [
      'error',
      {
        allowModules: [...paths],
      },
    ],
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'sonarjs/null-dereference': 'off',
    'sonarjs/argument-type': 'off',
    'sonarjs/function-return-type': 'off',
  };
}

export function getTypescriptConfig(rootName, tsConfigName = 'tsconfig.json', tsTestConfigName = 'tsconfig.test.json') {
  const fullConfigName = path.resolve(rootName, tsConfigName);
  const fullTestConfigName = path.resolve(rootName, tsTestConfigName);
  return [
    {
      files: ['**/*.ts', '**/*.tsx'],
      ignores: ['**/*.test.ts', '**/*.test.tsx'],
      plugins: {
        n: esLintPluginN,
      },
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
      plugins: {
        n: esLintPluginN,
      },
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

export const jsonConfig = {
  files: ['*.json'],
  languageOptions: {
    parser: jsoncParser,
  },
  plugins: {
    json: eslintPluginJson,
    prettier: eslintPluginPrettier.plugins.prettier,
  },
  rules: {
    'prettier/prettier': 'error',
    ...eslintPluginJson.configs['recommended-with-comments'].rules,
    'quotes': 'off',
    'quote-props': 'off',
    'no-unused-expressions': 'off',
    'no-irregular-whitespace': 'off',
  },
};

export function provideBaseConfig() {
  const sonarConfigRecommended = {
    ignores: ['*.json', '**/*.html'],
    ...eslintPluginSonar.configs.recommended,
  };
  return [
    sonarConfigRecommended,
    eslintPluginPrettier,
    ...javascriptConfig,
    ...eslintTypescript.configs.recommended,
    jsonConfig,
  ];
}
