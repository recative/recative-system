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
import { jsRule } from './rules/js';

// TODO: more generic config
export const getConfig = (
  mode: 'development' | 'production',
  server: boolean,
): Configuration => {
  const production = mode === 'production';
  const root = process.cwd();

  const result: Configuration = {
    mode,
    entry: production
      ? require.resolve('@recative/ap-pack/src/shell.ts')
      : require.resolve('@recative/ap-pack/src/devShell.ts'),
    devtool: production ? false : 'source-map',
    module: {
      rules: [
        ...jsRule,
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
    ignoreWarnings: [/Failed to parse source map/],
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
      clean: true,
      filename: '[name].js',
      path: server
        ? fs.mkdtempSync(path.resolve(os.tmpdir(), 'ap-pack-'))
        : path.resolve(root, 'dist'),
      publicPath: '/',
      // crossOriginLoading: 'use-credentials',
    },
    optimization: {
      chunkIds: 'named',
      runtimeChunk: 'single',
      splitChunks: {
        chunks: 'all',
        minSize: 1,
        name: 'scripts/shared/common',
        cacheGroups: {
          shared: {
            test: /[\\/]node_modules[\\/]/,
            name: () => 'scripts/shared/modules',
          },
          ap: {
            test: /[\\/]src[\\/]/,
            name: (module: { context: string }) => {
              if (!module.context) {
                return 'scripts/shared/unknown';
              }

              if (module.context.includes('mode_modules')) {
                return `scripts/shared/modules`;
              }

              const splittedPath = module.context.split(path.sep);

              const srcIndex = splittedPath.findIndex(
                (x) => x === 'src'
              ) + 1;
              const episodeIndex = splittedPath.findIndex(
                (x) => x === 'episodes'
              ) + 1;

              if (srcIndex && episodeIndex) {
                return `scripts/ap/${splittedPath[episodeIndex]}-${splittedPath[episodeIndex + 1]}`;
              }

              if (srcIndex) {
                return `scripts/shared/${splittedPath[srcIndex]}`;
              }

              return undefined
            },
          }
        }
      },
    },
  };

  return result;
};
