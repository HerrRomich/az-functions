import tseslint from "typescript-eslint";
import eslint from '@eslint/js';
import {defineConfig, globalIgnores} from "eslint/config";
import angular from "angular-eslint";

import { getTypeScriptPathsRules } from '../../../eslint.config.mjs';

import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import eslintPluginSonar from "eslint-plugin-sonarjs";
import globals from "globals";

const rootName = import.meta.dirname;

export default defineConfig([
  globalIgnores([".angular/", "node_modules/"]),
  {
    files: ["**/*.ts", ],
    extends: [
      eslintPluginPrettier,
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      eslintPluginSonar.configs.recommended,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    languageOptions: {
      globals: {
          ...globals.jest,
          ...globals.node,
          ...globals.browser,
      }
    },
    rules: {
      "@angular-eslint/directive-selector": [
        "error",
        {
          type: "attribute",
          prefix: "fs",
          style: "camelCase",
        },
      ],
      "@angular-eslint/component-selector": [
        "error",
        {
          type: "element",
          prefix: "fs",
          style: "kebab-case",
        },
      ],
    },
  },
  {
    files: ["**/*.html"],
    extends: [
      angular.configs.templateRecommended,
      angular.configs.templateAccessibility,
    ],
    rules: {},
  },
]);
