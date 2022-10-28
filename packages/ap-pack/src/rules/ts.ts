export const tsRule = [{
  test: /\.ts$/,
  loader: 'ts-loader',
  options: {
    compilerOptions: {
      module: 'ESNext',
    },
    allowTsInNodeModules: true,
    transpileOnly: true,
  },
}];
