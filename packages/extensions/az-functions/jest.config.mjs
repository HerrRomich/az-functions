import { getModuleNameMapper, provideBaseConfig } from '../../../jest.base.config.mjs';
import tsConfig from './tsconfig.json' with { type: 'json' };

const config = provideBaseConfig();
const moduleNameMapper = getModuleNameMapper(tsConfig.compilerOptions.paths);
export default {
  ...config,
  setupFilesAfterEnv: [...config.setupFilesAfterEnv, '<rootDir>/jest.setup.mjs'],
  coveragePathIgnorePatterns: [...config.coveragePathIgnorePatterns, '/src/test-utilities/'],
  testPathIgnorePatterns: [...config.testPathIgnorePatterns, '/src/test-utilities/'],
  transform: {
    ...config.transform,
    '^.+\\.m?js$': 'babel-jest',
  },
  moduleNameMapper,
};
