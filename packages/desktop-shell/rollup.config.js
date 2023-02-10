import sucrase from '@rollup/plugin-sucrase';
import resolve from "@rollup/plugin-node-resolve";
import commonjs from '@rollup/plugin-commonjs';

const packageJson = require("./package.json");

export default [
  {
    input: 'src/main/main.ts',
    output: [
      {
        file: packageJson.main,
        format: "cjs",
        sourcemap: false,
      }
    ],
    plugins: [
      commonjs(),
      resolve({
        extensions: ['.js', '.ts', '.tsx']
      }),
      sucrase({
        exclude: ['node_modules/**'],
        transforms: ['jsx', 'typescript']
      }),
    ],
    external: ['electron'],
  },
  {
    input: 'src/main/preload.ts',
    output: [
      {
        file: "build/preload.js",
        format: "cjs",
        sourcemap: false,
      }
    ],
    plugins: [
      commonjs(),
      resolve({
        extensions: ['.js', '.ts', '.tsx']
      }),
      sucrase({
        exclude: ['node_modules/**'],
        transforms: ['jsx', 'typescript']
      }),
    ],
    external: ['electron'],
  }
];
