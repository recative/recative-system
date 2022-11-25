import { WebPlugin } from '@capacitor/core';

import type { MemoryInfo, MemoryPressurePlugin } from './definitions';

export class MemoryPressureWeb
  extends WebPlugin
  implements MemoryPressurePlugin {
  async memoryInfo(): Promise<MemoryInfo> {
    throw new Error('Method not implemented.');
  }
}
