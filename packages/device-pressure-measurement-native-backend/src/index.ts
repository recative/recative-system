import { registerPlugin } from '@capacitor/core';

import type { MemoryPressurePlugin } from './definitions';

const MemoryPressure = registerPlugin<MemoryPressurePlugin>('MemoryPressure');

export * from './definitions';
export { MemoryPressure };
