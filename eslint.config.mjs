// eslint.config.mjs
import { includeIgnoreFile } from '@eslint/compat';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

import { FlatCompat } from '@eslint/eslintrc';
import eslintJavascript from '@eslint/js';
import eslintIgnoreConfig from '@nasa-gcn/eslint-config-gitignore';
import eslintPluginJest from 'eslint-plugin-jest';
import eslintPluginJson from 'eslint-plugin-json';
import nodePlugin from 'eslint-plugin-n';
import eslintPluginPrettier from 'eslint-plugin-prettier/recommended';
import { readFileSync } from 'fs';
import { existsSync } from 'node:fs';
import eslintTypescript from 'typescript-eslint';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const gitignorePath = resolve(__dirname, '.gitignore');

export function provideConfig(rootName) {
  const compat = new FlatCompat({
    baseDirectory: rootName,
    recommendedConfig: eslintJavascript.configs.recommended,
  });
  const testFiles = ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts'];

  const globalIgnoreConfig = {
    ignores: eslintIgnoreConfig.ignorePatterns,
  };

  const globalTypescriptConfig = [
    ...eslintTypescript.configs.stylistic,
    {
      languageOptions: {
        ecmaVersion: 2022,
      },
    },
  ];

  const globalPrettierConfig = [
    eslintPluginPrettier,
    {
      // global prettier rules
      rules: {
        'prettier/prettier': 'warn',
      },
    },
  ];

  const globalGoogleConfig = [
    nodePlugin.configs['flat/recommended'],
    {
      languageOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        globals: {
          es6: true,
          node: true,
          jest: true,
        },
      },
      rules: {
        'prettier/prettier': 'error',
        'block-scoped-var': 'error',
        'eqeqeq': ['error', 'smart'],
        'no-var': 'error',
        'prefer-const': 'error',
        'eol-last': 'error',
        'prefer-arrow-callback': 'error',
        'no-trailing-spaces': 'error',
        'quotes': ['warn', 'single', { 'avoidEscape': true, 'allowTemplateLiterals': true }],
        'no-restricted-properties': [
          'error',
          {
            'object': 'describe',
            'property': 'only',
          },
          {
            'object': 'it',
            'property': 'only',
          },
        ],
        'n/no-unpublished-import': 'off',
      },
    },
  ];

  const tsPaths = [];
  const tsConfigPath = join(rootName, './tsconfig.json');
  const importRegExp = /^((?:@[a-zA-Z0-9_\-.]+\/)?[a-zA-Z0-9_\-.]+)\/?/;
  if (existsSync(tsConfigPath)) {
    const data = JSON.parse(readFileSync(tsConfigPath).toString());
    const dataSet = new Set(
      Object.keys(data.compilerOptions.paths ?? {})
        .map((key) => {
          const match = importRegExp.exec(key);
          return match[1];
        })
        .filter((importKey) => importKey !== undefined)
    );
    tsPaths.push(...dataSet);
  }

  const typescriptConfig = {
    // typescript area
    files: ['**/*.ts', '**/*.tsx'],
    ignores: testFiles,
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: rootName,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          caughtErrors: 'none',
        },
      ],
      'n/no-extraneous-import': [
        'error',
        {
          allowModules: tsPaths,
        },
      ],
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-use-before-define': 'off',
      '@typescript-eslint/no-warning-comments': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/ban-types': 'off',
      '@typescript-eslint/camelcase': 'off',
      'n/no-missing-import': 'off',
      'n/no-empty-function': 'off',
      'n/no-unsupported-features/es-syntax': 'off',
      'n/no-missing-require': 'off',
      'n/shebang': 'off',
      'no-dupe-class-members': 'off',
      'require-atomic-updates': 'off',
    },
  };

  const typescriptTestConfig = {
    // typescript test area
    ...eslintPluginJest.configs['flat/recommended'],
    files: testFiles,
    plugins: {
      jest: eslintPluginJest,
    },
    languageOptions: {
      parserOptions: {
        project: './tsconfig.test.json',
        tsconfigRootDir: rootName,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          caughtErrors: 'none',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      'n/no-extraneous-import': [
        'error',
        {
          allowModules: ['jest-mock-extended', ...tsPaths],
        },
      ],
      'n/no-unpublished-import': 'off',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-use-before-define': 'off',
      '@typescript-eslint/no-warning-comments': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/ban-types': 'off',
      '@typescript-eslint/camelcase': 'off',
      'n/no-missing-import': 'off',
      'n/no-empty-function': 'off',
      'n/no-unsupported-features/es-syntax': 'off',
      'n/no-missing-require': 'off',
      'n/shebang': 'off',
      'no-dupe-class-members': 'off',
      'require-atomic-updates': 'off',
    },
  };

  const javascriptConfig = {
    // javascript area
    files: ['**/*.js', '**/*.mjs'],
    ...eslintJavascript.configs.recommended,
    rules: {
      'no-magic-numbers': 'off',
      'no-undef': 'warn',
    },
  };

  const jsonConfig = {
    // json area
    files: ['**/*.json'],
    ...eslintPluginJson.configs['recommended-with-comments'],
    rules: {
      'json/trailing-comma': 'warn',
    },
  };

  return [
    includeIgnoreFile(gitignorePath),
    globalIgnoreConfig,
    ...globalGoogleConfig,
    ...globalTypescriptConfig,
    ...globalPrettierConfig,

    typescriptConfig,
    typescriptTestConfig,
    javascriptConfig,
    jsonConfig,
  ];
}

const rootName = dirname(fileURLToPath(import.meta.url));

export default provideConfig(rootName);
