import type { PluginListenerHandle } from '@capacitor/core';
export interface MemoryInfoModel {
  platform: string;
  /**
   * Just usage memory
   * unit:byte
   */
  usage: number;
  /**
   * Total memory of device
   * unit:byte
   */
  total: number;
  /**
   * Available memory of device
   * Note: free not equal available
   * aways equal 0 in iOS now
   */
  available: number;
}

export type MemoryWarningListener = (response: MemoryInfoModel) => void;
export interface MemoryPressurePlugin {
  /**
   * return memory info
   */
  memoryInfo(): Promise<MemoryInfoModel>;
  /**
   * for receive memory warning
   * @param event
   * @param func
   */
  addListener(
    event: 'lowMemoryWarning',
    func: MemoryWarningListener,
  ): Promise<PluginListenerHandle> & PluginListenerHandle;

  /**
   * Remove all event listeners.
   */
  removeAllListeners(): Promise<void>;
}
