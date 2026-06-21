import type { Config } from 'jest';

import sharedConfig from '../../jest.config.base';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const jestConfig: any = {
  ...sharedConfig,
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.test.json',
      },
    ],
  },
};
export default jestConfig;
