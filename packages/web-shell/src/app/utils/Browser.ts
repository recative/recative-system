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

/**
 * A minimal utility used to open a new tab
 * compatible with implementation in @awesome-cordova-plugins/in-app-browser.
 */
export const InAppBrowser = {
  create: (
    url: string,
    target?: string,
    options?: string | Record<string, string>
  ) => {
    return window.open(url, target, convertInAppBrowserOption(options));
  },
};

let lastWindow: WindowProxy | null = null;

let browserFinishedListeners: (() => void)[] = [];

let checkWindowClosedInterval: ReturnType<typeof setInterval> | null = null;

// Its impossible to add event listener to a cross domain window, so query it every second
const checkWindowClosed = () => {
  if (lastWindow?.closed) {
    lastWindow = null;
    browserFinishedListeners.forEach((listener) => {
      listener();
    });
  }
};

const closeWindow = () => {
  if (lastWindow !== null) {
    lastWindow.close();
    lastWindow = null;
    browserFinishedListeners.forEach((listener) => {
      listener();
    });
  }
  clearInterval(checkWindowClosedInterval ?? undefined);
};

/**
 * Another minimal utility used to open a new tab
 * compatible with implementation in @capacitor/browser.
 */
export const Browser = {
  open: async (option: { url: string; windowName?: string }) => {
    closeWindow();
    lastWindow = window.open(option.url, option.windowName ?? '_blank');
    checkWindowClosedInterval = setInterval(checkWindowClosed, 1000);
  },
  close: async () => {
    if (lastWindow === null) {
      throw new Error('No active window to close!');
    }
    closeWindow();
  },
  addListener: (type: string, listener: () => void) => {
    if (type === 'browserFinished') {
      browserFinishedListeners.push(listener);
    }
  },
  removeAllListeners: () => {
    browserFinishedListeners = [];
  },
};
