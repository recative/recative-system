export type GoToEpisode = (
  seek: (assetOrder: number, assetTime: number) => void,
  episode: string,
  forceReload?: boolean,
  assetOrder?: number,
  assetTime?: number
) => void;

export type RawGoToEpisode = (
  seek: (assetOrder: number, assetTime: number) => void,
  episode: string,
  forceReload?: boolean,
  assetOrder?: number,
  assetTime?: number,
) => void;

export interface ShowVideoModalUrlRequest {
  title?: string;
  url: string;
}

export interface ShowVideoModalIdRequest {
  title?: string;
  resourceId: string;
}

export interface ShowVideoModalLabelRequest {
  title?: string;
  resourceLabel: string;
}

export interface ToastMessage {
  message: string;
  type?: 'normal' | 'warn' | 'error';
}

export interface CustomizedActionRequest {
  type: string;
  payload: unknown;
}

export interface PaymentRequest {
  type: string;
}

export interface RawUserImplementedFunctions {
  /**
   * Finish the current episode
   */
  finishEpisode(): void;
  /**
   * Jump to another series
   */
  gotoSeries(series: string): void;
  /**
   * Unlock another episode, if episode not provided, current episode will be unlocked
   */
  unlockEpisode(episode?: string): void;
  /**
   * Unlock another interaction
   */
  unlockAsset(asset: string): void;
  /**
   * Get persistent data for cloud service
   */
  getSavedData(slot: string): unknown;
  /**
   * Set persistent data for cloud service
   */
  setSavedData(slot: string, data: unknown): void;
  /**
   * Request payment from user
   */
  requestPayment(request: PaymentRequest): void;
  /**
   * Open a video Modal, should returns after it was closed
   */
  showVideoModal(
    request:
    | ShowVideoModalUrlRequest
    | ShowVideoModalIdRequest
    | ShowVideoModalLabelRequest
  ): void;
  /**
   * show a debug message
   */
  logDebugMessage(message: ToastMessage): void;
  /**
   * Enter fullscreen mode
   */
  enableAppFullScreenMode(): void;
  /**
   * Leave fullscreen mode
   */
  disableAppFullScreenMode(): void;
  /**
   * User choose to quit the app, mainly used in Electron platform
   */
  exit(): void;
  /**
   * Customized action for third party extension
   */
  customizedActionRequest(request: CustomizedActionRequest): unknown;
  gotoEpisode: RawGoToEpisode;
}

export type UserImplementedFunctions = Omit<RawUserImplementedFunctions, 'gotoEpisode'> & {
  gotoEpisode: GoToEpisode;
};
