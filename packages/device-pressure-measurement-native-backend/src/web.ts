import { WebPlugin } from '@capacitor/core';

import type { MemoryInfoModel, MemoryPressurePlugin } from './definitions';

export class MemoryPressureWeb
  extends WebPlugin
  implements MemoryPressurePlugin
{
  async memoryInfo(): Promise<MemoryInfoModel> {
    throw new Error('Method not implemented.');
  }
}
