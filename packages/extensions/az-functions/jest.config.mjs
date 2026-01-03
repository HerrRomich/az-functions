import { getModuleNameMapper, provideBaseConfig } from '../../../jest.base.config.mjs';
import tsConfig from './tsconfig.json' with { type: 'json' };

const config = provideBaseConfig();
const moduleNameMapper = getModuleNameMapper(tsConfig.compilerOptions.paths);
export default {
  ...config,
  setupFilesAfterEnv: [...config.setupFilesAfterEnv, '<rootDir>/jest.setup.mjs'],
  transform: {
    ...config.transform,
    '^.+\\.mjs$': 'babel-jest',
  },
  moduleNameMapper,
};
