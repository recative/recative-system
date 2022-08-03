import path from 'path';

import CopyWebpackPlugin from 'copy-webpack-plugin';

export const copyPlugin = [
  new CopyWebpackPlugin({
    patterns: [
      {
        from: path.resolve(process.cwd(), 'public'),
        to: '',
        // Public files should not be minimized by terser plugin
        info: { minimized: true as unknown as string },
      },
      {
        from: require.resolve(
          '@recative/resource-bridge/dist/sw/serviceWorker.js',
        ),
        to: './sw.js',
        // Public files should not be minimized by terser plugin
        info: { minimized: true as unknown as string },
      },
      {
        from: path.dirname(require.resolve('../../public/site.webmanifest')),
        to: '',
        // Public files should not be minimized by terser plugin
        info: { minimized: true as unknown as string },
      },
    ],
  }),
];
