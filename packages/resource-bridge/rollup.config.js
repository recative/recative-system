import dts from 'rollup-plugin-dts';
import cjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import sucrase from '@rollup/plugin-sucrase';
import external from 'rollup-plugin-peer-deps-external';
import nodePolyfills from 'rollup-plugin-polyfill-node';

const packageJson = require("./package.json");

export default [
  {
    input: 'src/serviceWorker.ts',
    output: [
      {
        file: packageJson.main,
        format: 'iife',
        sourcemap: true,
      }
    ],
    plugins: [
      nodePolyfills(),
      resolve({
        extensions: ['.js', '.ts', '.mjs', '.cjs', '.json', '.node'],
        preferBuiltins: false,
      }),
      cjs(),
      sucrase({
        transforms: ['typescript']
      }),
    ]
  },
  {
    input: 'src/index.ts',
    output: [
      {
        file: packageJson.main,
        format: "cjs",
        sourcemap: true,
      },
      {
        file: packageJson.module,
        format: "esm",
        sourcemap: true,
      },
    ],
    plugins: [
      external({
        includeDependencies: true
      }),
      resolve({
        extensions: ['.js', '.ts']
      }),
      sucrase({
        exclude: ['node_modules/**'],
        transforms: ['typescript']
      }),
    ]
  },
  {
    input: "src/index.ts",
    output: [
      {
        file: packageJson.types,
        format: "es",
        sourcemap: true,
      },
    ],
    plugins: [dts()],
  },
];