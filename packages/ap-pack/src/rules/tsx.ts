export const tsxRule = (production: boolean) => [
  {
    test: /\.tsx?$/i,
    exclude: production
      ? /node_modules/
      : /node_modules\/(?!(@recative\/act-player)\/).*/,
    use: {
      loader: 'babel-loader',
      options: {
        babelrc: false,
        presets: [
          require.resolve('@babel/preset-typescript'),
          [require.resolve('@babel/preset-react'), { runtime: 'automatic' }],
          [require.resolve('@babel/preset-env'), { modules: false }],
        ],
        plugins: [
          [
            '@babel/plugin-transform-runtime',
            {
              corejs: 3,
              helpers: true,
              regenerator: true,
            },
          ],
        ],
        cacheDirectory: true,
      },
    },
  },
  // !production
  //   ? // HERE
  //   : null,
];
