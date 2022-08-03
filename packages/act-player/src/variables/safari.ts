export const isIOSSafari = () => {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  const iOS = !!ua.match(/iPad/i) || !!ua.match(/iPhone/i);
  const webkit = !!ua.match(/WebKit/i);
  const iOSSafari = iOS && webkit && !ua.match(/CriOS/i);
  return iOSSafari;
};

export const isIPadOSSafari = () => {
  if (typeof window === 'undefined') return false;

  return window.navigator.maxTouchPoints
      && window.navigator.maxTouchPoints > 2
      && /MacIntel/.test(window.navigator.platform);
};

export const isSafari = () => {
  return isIOSSafari() || isIPadOSSafari();
};
