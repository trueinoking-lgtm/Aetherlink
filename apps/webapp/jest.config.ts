import type { Config } from 'jest';
import baseConfig from '../../jest.config.base';

const config: Config = {
  ...baseConfig,
  rootDir: __dirname,
  displayName: 'webapp',
};

export default config;
