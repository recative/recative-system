export const fontRule = [
  {
    test: /\.(fnt)$/i,
    use: [
      {
        loader: 'file-loader',
        options: {
          name: '[name].[ext]?[hash]',
          publicPath: 'font',
        },
      },
    ],
  },
  {
    test: /\.(ttf)$/i,
    use: [
      {
        loader: 'file-loader',
        options: {
          name: '[name].[ext]',
          publicPath: '../../fonts',
          outputPath: 'fonts',
        },
      },
    ],
  },
];
