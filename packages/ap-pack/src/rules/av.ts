export const avRule = [
  {
    test: /\.(mp4|mp3)$/i,
    use: [
      {
        loader: 'file-loader',
        options: {
          name: '[name].[hash].[ext]',
          publicPath: '../../media',
          outputPath: 'media',
        },
      },
    ],
  },
  {
    test: /\.(midi?)$/i,
    use: [
      {
        loader: 'url-loader',
        options: {
          name: '[name].[hash].[ext]',
          publicPath: '../../midi',
          outputPath: 'midi',
        },
      },
    ],
  },
];
