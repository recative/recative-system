export const computeResolution = (widthLimit = Infinity, heightLimit = Infinity) => {
  const { availHeight, availWidth } = window.screen;
  return Math.floor(
    Math.min(
      2,
      window.devicePixelRatio,
      heightLimit / Math.min(availHeight, availWidth),
      widthLimit / Math.max(availHeight, availWidth),
    ),
  );
}