import HtmlWebpackPlugin from 'html-webpack-plugin';

export const htmlPlugin = (
) => {
  const htmlPlugins: HtmlWebpackPlugin[] = [
    new HtmlWebpackPlugin({
      template: require.resolve('../../view/index.ejs'),
    }),
  ];

  return htmlPlugins;
};
