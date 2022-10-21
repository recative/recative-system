import path from 'path';
import os from 'os';
import fs from 'fs-extra';

import { resolve as withRoot } from 'app-root-path';
import { Configuration, ProgressPlugin } from 'webpack';

import NodePolyfillPlugin from 'node-polyfill-webpack-plugin';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import { WebpackManifestPlugin } from 'webpack-manifest-plugin';

import { avRule } from './rules/av';
import { tsRule } from './rules/ts';
import { cssRule } from './rules/css';
import { tsxRule } from './rules/tsx';
import { fontRule } from './rules/font';
import { htmlRule } from './rules/html';
import { basisRule } from './rules/basis';
import { imageRule } from './rules/image';

import { envPlugin } from './plugins/env';
import { copyPlugin } from './plugins/copy';
import { htmlPlugin } from './plugins/html';

// TODO: more generic config
export const getConfig = (
  mode: 'development' | 'production',
  server: boolean,
): Configuration => {
  const production = mode === 'production';
  const root = process.cwd();

  const result: Configuration = {
    mode,
    entry: require.resolve('@recative/ap-pack/src/shell.ts'),
    devtool: production ? false : 'inline-source-map',
    module: {
      rules: [
        ...tsRule,
        ...avRule,
        ...cssRule,
        ...fontRule,
        ...htmlRule,
        ...basisRule,
        ...imageRule,
        ...tsxRule(production),
      ],
    },
    plugins: [
      ...envPlugin,
      ...copyPlugin,
      ...htmlPlugin(),
      new ProgressPlugin(),
      new CleanWebpackPlugin(),
      new NodePolyfillPlugin(),
      new WebpackManifestPlugin({}),
    ],
    resolve: {
      extensions: ['.tsx', '.ts', '.js', '.json', '.fnt', '.ttf'],
      modules: [path.resolve(root, 'src'), path.resolve(root, 'node_modules')],
      alias: {
        src: withRoot('src'),
      },
    },
    output: {
      filename: '[name].js',
      path: server ? fs.mkdtempSync(path.resolve(os.tmpdir(), 'ap-pack-')) : path.resolve(root, 'dist'),
      publicPath: '/',
    },
    optimization: {
      chunkIds: 'named',
      runtimeChunk: 'single',
      splitChunks: {
        chunks: 'all',
        minSize: 1,
        name: (module: { context: string }) => {
          const splittedPath = module.context.split(path.sep);

          if (splittedPath.includes('node_modules')) {
            return 'shared';
          }

          return 0;
        },
      },
    },
  };

  return result;
};
