export const imageRule = [
  {
    test: /\.(png|jpg|jpeg|gif|glb|gltf)$/i,
    use: [
      {
        loader: 'url-loader',
        options: {
          limit: false,
          name: '[name].[hash].[ext]',
          publicPath: '../../imgs',
          outputPath: 'imgs',
        },
      },
    ],
  },
];
