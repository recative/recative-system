export const tsRule = [{
  test: /\.ts$/,
  loader: 'ts-loader',
  options: {
    allowTsInNodeModules: true,
    transpileOnly: true,
  },
}];
