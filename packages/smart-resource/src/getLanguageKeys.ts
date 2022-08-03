export const getLanguageKeys = (x?: string) => {
  const currentKey = x || navigator.language;

  if (currentKey === 'zh-Hans' || currentKey === 'zh-CN') {
    return 'zh-Hans';
  }

  if (currentKey.startsWith('zh-')) {
    return 'zh-Hant';
  }

  if (currentKey.startsWith('en')) {
    return 'en';
  }

  return 'en';
};
