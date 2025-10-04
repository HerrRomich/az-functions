import { readFileSync } from 'fs';
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
  preset: 'ts-jest',
  coverageReporters: ['lcov', 'text', 'cobertura'],
  testPathIgnorePatterns: ['/dist/'],
  ...moduleNameMapper,
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.test.json',
      },
    ],
    '^.+\\.mjs$': 'babel-jest',
  },
  setupFilesAfterEnv: ['jest-extended/all'],
};
