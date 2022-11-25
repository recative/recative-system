import { registerPlugin } from '@capacitor/core';

import type { VideoRendererPlugin } from './definitions';

const videoRenderer = registerPlugin<VideoRendererPlugin>('videoRenderer', {
  web: () => import('./web').then(m => new m.VideoRendererWeb()),
});

export * from './definitions';
export { videoRenderer };
