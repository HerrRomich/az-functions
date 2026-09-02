import { provideBaseConfig } from '../../../jest.base.config.mjs';

const config = provideBaseConfig('tsconfig.test.json', ['kysely']);
export default {
  ...config,
  setupFilesAfterEnv: [...config.setupFilesAfterEnv, '<rootDir>/jest.setup.mjs'],
  transform: {
    ...config.transform,
    '^.+\\.m?js$': 'babel-jest',
  },
};
