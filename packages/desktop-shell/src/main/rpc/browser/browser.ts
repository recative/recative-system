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
  // window.open(option.url, option.windowName ?? '_blank');
  // checkWindowClosedInterval = setInterval(checkWindowClosed, 1000);
}

export const BrowserClose = async () => {
  // if (lastWindow === null) {
  //   throw new Error('No active window to close!');
  // }
  // closeWindow();
}

export const BrowserAddListener = (type: string, listener: () => void) => {
  // if (type === 'browserFinished') {
  //   browserFinishedListeners.push(listener);
  // }
} 

export const BrowserRemoveAllListeners = () => {
  // browserFinishedListeners = [];
}