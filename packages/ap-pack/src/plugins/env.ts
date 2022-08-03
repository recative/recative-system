import { EnvironmentPlugin } from 'webpack';

export const envPlugin = [
  new EnvironmentPlugin({
    LEGACY_RESOLUTION: false,
  }),
];
