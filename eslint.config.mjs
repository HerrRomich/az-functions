import { javascriptConfig, provideBaseConfig } from './eslint.base.config.mjs';

const config = [...javascriptConfig, ...provideBaseConfig()];
export default config;
