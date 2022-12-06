export const a = 0;

module.exports = {
  babel: {
    loaderOptions: (babelLoaderOptions: any) => {
      const origBabelPresetCRAIndex = babelLoaderOptions.presets.findIndex(
        (preset: any) => {
          return preset[0].includes('babel-preset-react-app');
        }
      );

      const origBabelPresetCRA =
        babelLoaderOptions.presets[origBabelPresetCRAIndex];

      babelLoaderOptions.presets[origBabelPresetCRAIndex] =
        function overridenPresetCRA(api: any, opts: any, env: any) {
          const babelPresetCRAResult = (
            require(origBabelPresetCRA[0]) as unknown as Function
          )(api, origBabelPresetCRA[1], env);

          babelPresetCRAResult.presets.forEach((preset: any) => {
            // detect @babel/preset-react with {development: true, runtime: 'automatic'}
            const isReactPreset =
              preset &&
              preset[1] &&
              preset[1].runtime === 'automatic' &&
              preset[1].development === true;
            if (isReactPreset) {
              preset[1].importSource = '@welldone-software/why-did-you-render';
            }
          });

          return babelPresetCRAResult;
        };

      return babelLoaderOptions;
    },
  },
  webpack: {
    configure: (webpackConfig: Record<string, unknown>) => {
      // Disable polyfills
      if (!('resolve' in webpackConfig)) {
        webpackConfig.resolve = {};
      }

      const resolve = webpackConfig.resolve as Record<string, unknown>;

      if (!('fallback' in resolve)) {
        resolve.fallback = {};
      }

      const fallback = resolve.fallback as Record<string, unknown>;

      fallback.http = false;
      fallback.https = false;

      // Disable unnecessary warnings.
      if (!('ignoreWarnings' in webpackConfig)) {
        webpackConfig.ignoreWarnings = [];
      }

      (webpackConfig.ignoreWarnings as unknown[]).push(
        /Failed to parse source map/
      );

      return webpackConfig;
    },
  },
};
