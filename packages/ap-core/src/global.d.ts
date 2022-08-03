import type * as PIXI from 'pixi.js-legacy';

declare global {
  interface Window { PIXI: typeof PIXI; }
}
