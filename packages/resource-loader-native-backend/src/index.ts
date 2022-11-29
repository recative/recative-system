import { registerPlugin } from '@capacitor/core';

import type { ResourceLoaderPlugin } from './definitions';

const ResourceLoader = registerPlugin<ResourceLoaderPlugin>('ResourceLoader');

export * from './definitions';
export { ResourceLoader };
