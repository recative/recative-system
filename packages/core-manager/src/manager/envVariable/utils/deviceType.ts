/* eslint-disable operator-linebreak */
let os:
| 'Windows Phone'
| 'Android'
| 'iOS'
| 'macOS'
| 'Windows'
| 'Linux'
| 'unknown' = 'unknown';
let mobile = false;
const weChat: boolean =
  !!window && !!navigator.userAgent.match(/MicroMessenger/i);

export const touchScreen: boolean =
  'ontouchstart' in window ||
  navigator.maxTouchPoints > 0 ||
  // @ts-ignore: IE!
  navigator.msMaxTouchPoints;

/**
 * Test if the device is iPadOS, and treat it as iOS.
 * @returns Is iPadOS or not.
 */
export const isIpadOS = () => {
  return (
    navigator.maxTouchPoints &&
    navigator.maxTouchPoints > 2 &&
    /MacIntel/.test(navigator.platform)
  );
};

/**
 * Get operating system name, 'unknown' for desktop devices and unknown
 * devices.
 * @returns The name of the operating system.
 */
export const getOS = () => os;

/**
 * Get if the program is running on a mobile device.
 * @returns Is running on mobile device or not.
 */
export const isMobile = () => mobile;

/**
 * Get if the program is running on WeChat.
 * @returns Fuck you WeChat.
 */
export const isWeChat = () => weChat;

/**
 * Get if the device is a touch screen.
 * @returns Is a touch screen or not.
 */
export const isTouchScreen = () => touchScreen;

if (window) {
  // @ts-ignore
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;

  if (/windows phone/i.test(userAgent)) {
    os = 'Windows Phone';
  } else if (/android/i.test(userAgent)) {
    os = 'Android';
    mobile = true;
    // @ts-ignore: IE!
  } else if (/iPad|iPhone|iPod|iOS/.test(userAgent) && !window.MSStream) {
    os = 'iOS';
    mobile = true;
  } else if (isIpadOS()) {
    os = 'iOS';
    mobile = true;
  } else {
    // Desktop platform
    const { platform } = navigator;

    if (platform.startsWith('Win')) {
      os = 'Windows';
    } else if (platform.startsWith('Mac')) {
      os = 'macOS';
    } else if (platform.startsWith('Linux')) {
      os = 'Linux';
    }
  }
}
