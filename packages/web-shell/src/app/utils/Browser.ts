const convertInAppBrowserOption = (options?: string | Record<string, string>) => {
  if (!options || typeof options === "string") {
    return options
  }
  return Object.entries(options).map(([key, value]) => `${key}=${value}`).join(",")
}

/**
 * A minimal utility used to open a new tab
 * compatible with implementation in @awesome-cordova-plugins/in-app-browser.
 */
export const InAppBrowser = {
  create: (url: string, target?: string, options?: string | Record<string, string>) => {
    return window.open(url, target, convertInAppBrowserOption(options))
  }
}
