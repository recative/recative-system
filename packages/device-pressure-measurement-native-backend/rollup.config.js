import dts from 'rollup-plugin-dts';
import resolve from '@rollup/plugin-node-resolve';
import sucrase from '@rollup/plugin-sucrase';
import external from 'rollup-plugin-peer-deps-external';

const packageJson = require('./package.json');

export default [
  {
    input: packageJson.source,
    output: [
      {
        file: packageJson.main,
        format: 'cjs',
        sourcemap: true,
        inlineDynamicImports: true,
      },
      {
        file: packageJson.module,
        format: 'esm',
        sourcemap: true,
        inlineDynamicImports: true,
      },
      {
        file: packageJson.unpkg,
        format: 'iife',
        name: packageJson.namespace,
        globals: {
          '@capacitor/core': 'capacitorExports',
        },
        sourcemap: true,
        inlineDynamicImports: true,
      },
      {
        file: packageJson.unpkg.replace('.js', '.cjs.js'),
        format: 'cjs',
        sourcemap: true,
        inlineDynamicImports: true,
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
    ],
    external: ['@capacitor/core'],
  },
  {
    input: packageJson.source,
    output: [
      {
        file: packageJson.types,
        format: 'es',
        sourcemap: true,
      },
    ],
    plugins: [dts()],
  },
]
