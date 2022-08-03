import path from 'path';

import HtmlWebpackPlugin from 'html-webpack-plugin';

import { getProjectMetadata } from '../utils';

export const htmlPlugin = (
  production: boolean,
  metadata: ReturnType<typeof getProjectMetadata>,
) => {
  const transformPath = (rootPath: string) => (file: string) => path.posix.relative(
    path.posix.resolve('/', rootPath),
    path.posix.resolve('/', rootPath, file),
  );

  const htmlPlugins: HtmlWebpackPlugin[] = [];

  if (metadata.index !== undefined) {
    htmlPlugins.push(
      new HtmlWebpackPlugin({
        hash: true,
        cache: true,
        filename: 'index.html',
        template: require.resolve('../../view/index.ejs'),
        inject: production ? 'body' : false,
        chunks: ['dev'],
        favicon: '',
        urlPrefix: './',
        transformPath: transformPath('/'),
      }),
    );
  }

  metadata.episodeMetadata.forEach(({ episode, point }, name) => {
    htmlPlugins.push(
      new HtmlWebpackPlugin({
        hash: true,
        cache: true,
        filename: production
          ? `${episode}/${point}/[contenthash]index.html`
          : `${episode}/${point}/index.html`,
        template: require.resolve('../../view/ap.ejs'),
        inject: false,
        chunks: [name],
        favicon: '',
        urlPrefix: '../../',
        transformPath: transformPath(`/${episode}/${point}`),
      }),
    );
  });

  return htmlPlugins;
};
