import { FlatCompat } from '@eslint/eslintrc';
import eslintJavascript from '@eslint/js';
import eslintIgnoreConfig from '@nasa-gcn/eslint-config-gitignore';
import eslintPluginJest from 'eslint-plugin-jest';
import eslintPluginJson from 'eslint-plugin-json';
import eslintPluginPrettier from 'eslint-plugin-prettier/recommended';
import eslintPluginSonar from 'eslint-plugin-sonarjs';
import globals from 'globals';
import eslintGoogleConfig from 'gts';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from 'tsconfig-paths';
import eslintTypescript from 'typescript-eslint';

export function provideConfig(rootName) {
  const compat = new FlatCompat({
    baseDirectory: rootName,
    recommendedConfig: eslintJavascript.configs.recommended,
  });
  const sonarjsRecommended = eslintPluginSonar.configs.recommended;
  const testFiles = ['**/*.test.ts', '**/*.spec.ts'];

  const sonarjsUnusedRules = {
    // set invalid (!) sonar rules as 'off'
    'sonarjs/no-invalid-await': 'off',
    'sonarjs/different-types-comparison': 'off',
    'sonarjs/no-unused-vars': 'off',
    'sonarjs/function-return-type': 'off',

    // switched off in SonarQube server
    'sonarjs/arguments-usage': 'off', // S3513
    'sonarjs/array-constructor': 'off', // S1528
    'sonarjs/arrow-function-convention': 'off', // S3524
    'sonarjs/aws-iam-all-resources-accessible': 'off', // S6304
    'sonarjs/aws-s3-bucket-server-encryption': 'off', // S6245
    'sonarjs/bool-param-default': 'off', // S4798
    'sonarjs/class-prototype': 'off', // S3525
    'sonarjs/comment-regex': 'off', // S124
    'sonarjs/conditional-indentation': 'off', // S3973
    'sonarjs/cookies': 'off', // S2255
    'sonarjs/cyclomatic-complexity': 'off', // S1541
    'sonarjs/destructuring-assignment-syntax': 'off', // S3514
    'sonarjs/dns-prefetching': 'off', // S5743
    'sonarjs/elseif-without-else': 'off', // S126
    'sonarjs/encryption': 'off', // S4787
    'sonarjs/enforce-trailing-comma': 'off', // S3723
    'sonarjs/expression-complexity': 'off', // S1067
    'sonarjs/file-header': 'off', // S1451
    'sonarjs/file-name-differ-from-class': 'off', // S3317
    'sonarjs/fixme-tag': 'off', // S1134
    'sonarjs/for-in': 'off', // S1535
    'sonarjs/function-name': 'off', // S100
    'sonarjs/max-lines': 'off', // S104
    'sonarjs/max-lines-per-function': 'off', // S138
    'sonarjs/max-union-size': 'off', // S4622
    'sonarjs/nested-control-flow': 'off', // S134
    'sonarjs/no-built-in-override': 'off', // S2424
    'sonarjs/no-case-label-in-switch': 'off', // S1219
    'sonarjs/no-collapsible-if': 'off', // S1066
    'sonarjs/no-duplicate-string': 'off', // S1192
    'sonarjs/no-for-in-iterable': 'off', // S4139
    'sonarjs/no-function-declaration-in-block': 'off', // S1530
    'sonarjs/no-hardcoded-ip': 'off', // S1313
    'sonarjs/no-implicit-dependencies': 'off', // S4328
    'sonarjs/no-inconsistent-returns': 'off', // S3801
    'sonarjs/no-incorrect-string-concat': 'off', // S3402
    'sonarjs/no-nested-incdec': 'off', // S881
    'sonarjs/no-nested-switch': 'off', // S1821
    'sonarjs/no-parameter-reassignment': 'off', // S1226
    'sonarjs/no-redundant-parentheses': 'off', // S1110
    'sonarjs/no-require-or-define': 'off', // S3533
    'sonarjs/no-return-type-any': 'off', // S4324
    'sonarjs/no-tab': 'off', // S105
    'sonarjs/no-undefined-assignment': 'off', // S2138
    'sonarjs/no-unused-function-argument': 'off', // S1172
    'sonarjs/no-variable-usage-before-declaration': 'off', // S1526
    'sonarjs/no-wildcard-import': 'off', // S2208
    'sonarjs/prefer-immediate-return': 'off', // S1488
    'sonarjs/prefer-while': 'off', // S1264
    'sonarjs/process-argv': 'off', // S4823
    'sonarjs/regular-expr': 'off', // S4784
    'sonarjs/shorthand-property-grouping': 'off', // S3499
    'sonarjs/sockets': 'off', // S4818
    'sonarjs/standard-input': 'off', // S4829
    'sonarjs/strings-comparison': 'off', // S3003
    'sonarjs/todo-tag': 'off', // S1135
    'sonarjs/too-many-break-or-continue-in-loop': 'off', // S135
    'sonarjs/unicode-aware-regex': 'off', // S5867
    'sonarjs/useless-string-operation': 'off', // S1154
    'sonarjs/variable-name': 'off', // S117
    'sonarjs/web-sql-database': 'off', // S2817
    'sonarjs/xpath': 'off', // S4817

    // switched off in SonarQube server but from external tools
    '@typescript-eslint/adjacent-overload-signatures': 'off',
    '@typescript-eslint/comma-dangle': 'off',
    '@typescript-eslint/no-empty-interface': 'off',
    '@typescript-eslint/no-extra-semi': 'off',
    '@typescript-eslint/no-inferrable-types': 'off',
    '@typescript-eslint/no-magic-numbers': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/no-shadow': 'off',
    '@typescript-eslint/no-this-alias': 'off',
    '@typescript-eslint/no-unnecessary-type-arguments': 'off',
    '@typescript-eslint/prefer-readonly': 'off',
    '@typescript-eslint/semi': 'off',
    'jsx-a11y/iframe-has-title': 'off',
    'react/jsx-no-bind': 'off',
    'accessor-pairs': 'off',
    'brace-style': 'off',
    'curly': 'off',
    'eol-last': 'off',
    'eqeqeq': 'off',
    'line-comment-position': 'off',
    'max-len': 'off',
    'max-statements-per-line': 'off',
    'no-console': 'off',
    'no-continue': 'off',
    'no-debugger': 'off',
    'no-octal': 'off',
    'no-return-await': 'off',
    'no-template-curly-in-string': 'off',
    'no-ternary': 'off',
    'no-trailing-spaces': 'off',
    'no-unused-private-class-members': 'off',
    'object-shorthand': 'off',
    'prefer-const': 'off',
    'prefer-template': 'off',
    'quotes': 'off',
    'radix': 'off',
    'strict': 'off',
  };

  const globalIgnoreConfig = {
    ignores: eslintIgnoreConfig.ignorePatterns,
  };

  const globalSonarConfig = [
    sonarjsRecommended,
    {
      rules: sonarjsUnusedRules,
    },
  ];

  const globalTypescriptConfig = [
    ...eslintTypescript.configs.stylistic,
    {
      languageOptions: {
        parser: eslintTypescript.parser,
        ecmaVersion: 2022,
        parserOptions: {
          tsconfigRootDir: rootName,
        },
      },
    },
  ];

  const globalPrettierConfig = [
    eslintPluginPrettier,
    {
      rules: {
        'prettier/prettier': 'warn',
      },
    },
  ];

  const tsConfig = loadConfig(rootName);
  const paths = Object.keys(tsConfig.paths ?? {}).map(path => path.replace(/\/\*$/, ''));

  const typescriptConfig = [
    {
      files: ['**/*.ts', '**/*.tsx'],
      ignores: testFiles,
      languageOptions: {
        parserOptions: {
          project: 'tsconfig.json',
        },
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unused-vars': [
          'error',
          {
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
            caughtErrorsIgnorePattern: '^_',
            caughtErrors: 'none',
          },
        ],
        '@typescript-eslint/no-unsafe-enum-comparison': 'error',
        '@typescript-eslint/switch-exhaustiveness-check': [
          'error',
          {
            considerDefaultExhaustiveForUnions: false,
          },
        ],
        'n/no-extraneous-import': [
          'error',
          {
            allowModules: [...paths],
          },
        ],
      },
    },
  ];

  const typescriptTestConfig = [
    {
      files: testFiles,
      ...eslintPluginJest.configs['flat/recommended'],
    },
    {
      // set all sonar rules as warning by default for tests
      files: testFiles,
      rules: {
        ...Object.fromEntries(Object.keys(sonarjsRecommended.rules).map(rule => [rule, 'warn'])),
        ...sonarjsUnusedRules,
      },
    },
    {
      files: testFiles,
      languageOptions: {
        parserOptions: {
          project: 'tsconfig.test.json',
        },
      },
      rules: {
        'sonarjs/no-clear-text-protocols': 'off',
        'sonarjs/no-nested-functions': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        'jest/no-conditional-expect': 'off',

        'no-useless-escape': 'warn',
        '@typescript-eslint/no-unused-vars': [
          'warn',
          {
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
            caughtErrorsIgnorePattern: '^_',
            caughtErrors: 'none',
          },
        ],
        '@typescript-eslint/switch-exhaustiveness-check': [
          'warn',
          {
            considerDefaultExhaustiveForUnions: false,
          },
        ],
        'n/no-extraneous-import': [
          'error',
          {
            allowModules: [...paths],
          },
        ],
      },
    },
  ];

  const javascriptConfig = [
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

  const jsonConfig = [
    eslintPluginJson.configs['recommended-with-comments'],
    {
      files: ['**/*.json'],
      rules: {
        'json/*': 'warn',
      },
    },
  ];

  return [
    globalIgnoreConfig,
    ...compat.config(eslintGoogleConfig),
    ...globalTypescriptConfig,
    ...globalSonarConfig,
    ...globalPrettierConfig,

    ...typescriptConfig,
    ...typescriptTestConfig,
    ...javascriptConfig,
    ...jsonConfig,
  ];
}

const rootName = path.dirname(fileURLToPath(import.meta.url));

export default provideConfig(rootName);
