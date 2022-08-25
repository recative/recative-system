import type { RectXywh, RectWh } from './rectStructs';

export const reportResult = (rectangles: RectXywh[], resultSize: RectWh) => {
  let log = '\r\nResultant bin\r\n==============\r\n\r\nX\tY\tW\tH\r\n----\t----\t----\t----\r\n';
  rectangles.forEach((r) => {
    log += `${r.x}\t${r.y}\t${r.w}\t${r.h}\r\n`;
  });

  log += `\r\nSize: ${resultSize.w} x ${resultSize.h}`;

  console.log(log);
};
