import { pathsToModuleNameMapper } from 'ts-jest';

export function getModuleNameMapper(tsConfigPaths) {
  return {
    ...pathsToModuleNameMapper(tsConfigPaths, { prefix: '<rootDir>' }),
  };
}

export function baseConfig(tsTestConfigName = 'tsconfig.test.json') {
  return {
    clearMocks: true,
    resetMocks: true,
    restoreMocks: true,
    preset: 'ts-jest',
    coverageReporters: ['lcov', 'text', 'cobertura'],
    testPathIgnorePatterns: ['/dist/'],
    transform: {
      '^.+\\.ts$': [
        'ts-jest',
        {
          tsconfig: `<rootDir>/${tsTestConfigName}`,
        },
      ],
      '^.+\\.mjs$': 'babel-jest',
    },
    setupFilesAfterEnv: ['jest-extended/all'],
  };
}
