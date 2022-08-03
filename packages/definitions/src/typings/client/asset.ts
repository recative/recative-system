export interface AssetForClient {
  id: string;
  duration: number;
  preloadDisabled: boolean;
  earlyDestroyOnSwitch: boolean;
  spec: ContentSpec;
}

export type ContentSpec<T extends {} = Record<string, unknown>> = {
  contentExtensionId: string;
} & T;
