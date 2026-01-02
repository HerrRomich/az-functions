import { baseConfig } from '../../../jest-base.config.mjs';

const config = baseConfig();
export default {
  ...config,
  setupFilesAfterEnv: [...config.setupFilesAfterEnv, '<rootDir>/jest.setup.mjs'],
};
