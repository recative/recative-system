export const jsRule = [
  {
    test: /\.js$/,
    enforce: "pre",
    use: ["source-map-loader"],
  },
];