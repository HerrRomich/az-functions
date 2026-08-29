import { readFileSync } from 'node:fs';
import { pathsToModuleNameMapper } from 'ts-jest';

const tsConfig = JSON.parse(readFileSync('./tsconfig.json').toString());
const tsConfigPaths = tsConfig.compilerOptions.paths;
const moduleNameMapper = tsConfigPaths
  ? {
      moduleNameMapper: {
        ...pathsToModuleNameMapper(tsConfigPaths, { prefix: '<rootDir>' }),
      },
    }
  : {};

export default {
  preset: 'jest-preset-angular',
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['ts', 'html', 'js', 'json', 'mjs'],
  snapshotSerializers: [
    'jest-preset-angular/build/serializers/html-comment',
    'jest-preset-angular/build/serializers/ng-snapshot',
    'jest-preset-angular/build/serializers/no-ng-attributes',
  ],

  coverageReporters: ['lcov', 'text', 'cobertura'],
  ...moduleNameMapper,
  transform: {
    '^.+\\.(ts|mjs|js|html|svg)$': [
      'jest-preset-angular',
      {
        stringifyContentPathRegex: '\\.(html|svg)$',
        tsconfig: '<rootDir>/tsconfig.spec.json',
      },
    ],
    '^.+\\.mjs$': 'babel-jest',
  },
  setupFilesAfterEnv: ['jest-extended/all', '<rootDir>/jest.setup.mjs'],
};
