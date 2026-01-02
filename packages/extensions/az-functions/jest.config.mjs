import { baseConfig, getModuleNameMapper } from '../../../jest-base.config.mjs';
import tsConfig from './tsconfig.json' with { type: 'json' };

const config = baseConfig();
const moduleNameMapper = getModuleNameMapper(tsConfig.compilerOptions.paths);
export default {
  ...config,
  setupFilesAfterEnv: [...config.setupFilesAfterEnv, '<rootDir>/jest.setup.mjs'],
  moduleNameMapper,
};
