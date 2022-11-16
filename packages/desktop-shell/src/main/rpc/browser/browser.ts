import { shell } from 'electron'

const convertInAppBrowserOption = (
  options?: string | Record<string, string>
) => {
  if (!options || typeof options === 'string') {
    return options;
  }
  return Object.entries(options)
    .map(([key, value]) => `${key}=${value}`)
    .join(',');
};

export const InAppBrowserCreate = (
  url: string,
  target?: string,
  options?: string | Record<string, string>
) => {
  // return shell.openExternal(url)
  return window.open(url, target, convertInAppBrowserOption(options));
}

export const BrowserOpen =  async (option: { url: string; windowName?: string }) => {
  console.error('BrowserOpen', option)
  shell.openExternal(option.url)
}

export const BrowserClose = async () => {

}

export const BrowserAddListener = (type: string, listener: () => void) => {

} 

export const BrowserRemoveAllListeners = () => {
}