import { provideBaseConfig } from '../../../jest.base.config.mjs';

const config = provideBaseConfig();
export default {
  ...config,
  setupFilesAfterEnv: [...config.setupFilesAfterEnv, '<rootDir>/jest.setup.mjs'],
  transform: {
    ...config.transform,
    '^.+\\.mjs$': 'babel-jest',
  },
};
