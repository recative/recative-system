export const basisRule = [{
  test: /\.(basis)$/i,
  use: [
    {
      loader: 'file-loader',
      options: {
        name: '[name].[hash].[ext]',
        publicPath: '../../imgs',
        outputPath: 'imgs',
      },
    },
  ],
}];
