export const getScreenSizeKeyword = () => {
  if (typeof window === 'undefined') {
    return 'large';
  }
  if (window.innerWidth <= 667) {
    return 'small';
  }
  if (window.innerWidth > 667 && window.innerWidth < 812) {
    return 'medium';
  }
  return 'large';
};
