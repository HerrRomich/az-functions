import { pathsToModuleNameMapper } from 'ts-jest';

export function getModuleNameMapper(tsConfigPaths) {
  return {
    ...pathsToModuleNameMapper(tsConfigPaths, { prefix: '<rootDir>' }),
  };
}

export function provideBaseConfig(tsTestConfigName = 'tsconfig.test.json') {
  return {
    clearMocks: true,
    resetMocks: true,
    restoreMocks: true,
    preset: 'ts-jest',
    coverageReporters: ['lcov', 'text', 'cobertura'],
    coveragePathIgnorePatterns: ['/test/'],
    testPathIgnorePatterns: ['/dist/', '/node_modules/', '/test/'],
    transform: {
      '^.+\\.ts$': [
        'ts-jest',
        {
          tsconfig: `<rootDir>/${tsTestConfigName}`,
        },
      ],
    },
    setupFilesAfterEnv: ['jest-extended/all'],
  };
}
