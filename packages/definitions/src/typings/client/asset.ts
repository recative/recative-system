import { ManagerCoreStateTrigger } from './managedCoreState';

export interface IAssetForClient {
  id: string;
  duration: number;
  preloadDisabled: boolean;
  earlyDestroyOnSwitch: boolean;
  spec: ContentSpec;
  triggers?: ManagerCoreStateTrigger[];
}

export type ContentSpec<T extends {} = Record<string, unknown>> = {
  contentExtensionId: string;
  extensionConfiguration: Record<string, string>;
} & T;
