const convertInAppBrowserOption = (options?: string | Record<string, string>) => {
  if (!options || typeof options === "string") {
    return options;
  }
  return Object.entries(options).map(([key, value]) => `${key}=${value}`).join(",");
};

/**
 * A minimal utility used to open a new tab
 * compatible with implementation in @awesome-cordova-plugins/in-app-browser.
 */
export const InAppBrowser = {
  create: (url: string, target?: string, options?: string | Record<string, string>) => {
    return window.open(url, target, convertInAppBrowserOption(options));
  }
};

/**
 * Another minimal utility used to open a new tab
 * compatible with implementation in @capacitor/browser.
 */
export const Browser = {
  _lastWindow: null as WindowProxy | null,
  open: async (option: {
    url: string,
    windowName?: string,
  }) => {
    Browser._lastWindow = window.open(option.url, option.windowName ?? '_blank');
  },
  close: async () => {
    if (Browser._lastWindow === null) {
      throw new Error('No active window to close!');
    }
    Browser._lastWindow.close();
    Browser._lastWindow = null;
  },
  addListener: () => {
    // do nothing
  }
}
