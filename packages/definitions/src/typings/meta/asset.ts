import { ManagerCoreStateTrigger } from '../client/managedCoreState';

export interface IAsset {
  id: string;
  tags?: string | string[];
  contentExtensionId: string;
  order: number;
  preloadDisabled: boolean;
  earlyDestroyOnSwitch: boolean;
  episodeId: string;
  contentId: string;
  notes: string;
  createTime: number;
  updateTime: number;
  triggers?: ManagerCoreStateTrigger[];
}
