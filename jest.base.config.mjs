import { pathsToModuleNameMapper } from 'ts-jest';

export function getModuleNameMapper(tsConfigPaths) {
  return {
    ...pathsToModuleNameMapper(tsConfigPaths, { prefix: '<rootDir>' }),
  };
}

export function provideBaseConfig(tsTestConfigName = 'tsconfig.test.json', esmPackageNames = []) {
  return {
    clearMocks: true,
    resetMocks: true,
    restoreMocks: true,
    preset: 'ts-jest',
    coverageReporters: ['lcov', 'text', 'cobertura'],
    coveragePathIgnorePatterns: ['/test/'],
    testPathIgnorePatterns: ['/dist/', '/node_modules/', '/test/'],
    ...(esmPackageNames.length > 0
      ? {
          // pnpm hoists deps into a `.pnpm/<pkg>@<version>/node_modules/<pkg>` virtual
          // store, so the ignore pattern must key off the `.pnpm` segment, not a plain
          // `node_modules/<pkg>` segment.
          transformIgnorePatterns: [`/node_modules/\\.pnpm/(?!(${esmPackageNames.join('|')})@)`],
        }
      : {}),
    transform: {
      '^.+\\.ts$': [
        'ts-jest',
        {
          tsconfig: `<rootDir>/${tsTestConfigName}`,
        },
      ],
      ...(esmPackageNames.length > 0 ? { '^.+\\.[cm]?js$': 'babel-jest' } : {}),
    },
    setupFilesAfterEnv: ['jest-extended/all'],
  };
}
