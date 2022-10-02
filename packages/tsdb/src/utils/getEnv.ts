export enum Environment {
  NodeJs = 'NODEJS',
  Browser = 'BROWSER',
  Cordova = 'CORDOVA',
  NativeScript = 'NATIVESCRIPT',
  Memory = 'MEMORY',
  Na = 'NA',
}

/**
 * refactored environment detection due to invalid detection for browser
 * environments. If they do not specify an options.env we want to detect env
 * rather than default to nodejs.
 * currently keeping two properties for similar thing (`options.env` and
 * options.persistenceMethod) might want to review whether we can consolidate.
*/
export const getEnv = () => {
  // If no adapter assume nativescript which needs adapter to be passed manually
  if (
    typeof global !== 'undefined'
    && ('android' in global || 'NSObject' in global)
  ) {
    return Environment.NativeScript;
  }

  if (typeof window === 'undefined') {
    return Environment.NodeJs;
  }

  // node-webkit
  if (
    typeof global !== 'undefined'
    && global.window && typeof process !== 'undefined'
  ) {
    return Environment.NodeJs;
  }

  if (typeof document !== 'undefined') {
    if (
      document.URL.indexOf('http://') === -1
      && document.URL.indexOf('https://') === -1
    ) {
      return Environment.Cordova;
    }

    return Environment.Browser;
  }

  return Environment.Cordova;
};
