import type {
  ManagedCoreState,
  ResourceLoaderCacheLevel,
  IResourceItemForClient,
  IDetailedResourceItemForClient,
  RawUserImplementedFunctions,
  ShowVideoModalUrlRequest,
  ShowVideoModalIdRequest,
  ShowVideoModalLabelRequest,
  IAssetForClient,
} from '@recative/definitions';

export interface BGM {
  id: string;
}

export interface AudioDefine {
  id: string;
  src: string;
  subtitles?: Partial<SubtitleDefine>[];
}

export interface SubtitleDefine {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
}

export interface AdditionalSubtitleDefine {
  id: string;
  subtitles?: Partial<SubtitleDefine>[];
}

export enum DialogDirection {
  Left,
  Right,
}

export interface ResourceDialogMessageById {
  type: 'resource';
  direction: DialogDirection;
  id: string;
}

export interface ResourceDialogMessageByLabel {
  type: 'resource';
  direction: DialogDirection;
  label: string;
}

export type ResourceDialogMessage =
  | ResourceDialogMessageById
  | ResourceDialogMessageByLabel;

export interface ImageDialogMessage {
  type: 'image';
  direction: DialogDirection;
  src: string;
}

export interface TextDialogMessage {
  type: 'text';
  direction: DialogDirection;
  content: string;
}

export type DialogMessage =
  | ImageDialogMessage
  | TextDialogMessage
  | ResourceDialogMessage;

export interface DialogAction {
  id: string;
  label: string;
}

export interface DialogActions {
  id: string;
  column: number;
  actions: DialogAction[];
}

export interface TextInputDefinition {
  fieldId: string;
  fieldName: string;
  type: 'multiLine' | 'singleLine';
  initialValue: string;
}

export interface AddAudioByLabelRequest {
  requestId: string;
  resourceLabel: string;
}

export interface AddAudioByIdRequest {
  requestId: string;
  resourceId: string;
}

export type AddAudioRequest = AddAudioByLabelRequest | AddAudioByIdRequest;

export type HostFunctions = Omit<RawUserImplementedFunctions, 'gotoEpisode'> & {
  // lifecycle
  /**
   * Should be called when the content was ready
   */
  ready(): void;
  /**
   * Should be called when the content was not ready on a specific time
   */
  loading(): void;
  /**
   * Should be called when the content was completed
   */
  complete(): void;
  /**
   * Should be called when the content was about to exit
   */
  close(): void;
  /**
   * Should be called when the content encountered fatal errors
   */
  panic(code: string, message: string): void;

  /**
   * Require for environment variable force update
   */
  requireEnvironment(): void;
  // legacy subtitle control
  /**
   * Show a subtitle
   */
  showSubtitle(text: string): void;
  /**
   * Hide subtitles shown by showSubtitle
   */
  hideSubtitle(): void;

  // legacy BGM control
  /**
   * Add BGM to the end of playlist
   */
  addBGMToPlaylist(bgm: BGM[]): void;
  /**
   * Replace playlist with given BGM
   */
  replaceBGMInPlaylist(bgm: BGM[]): void;

  // audio control
  /**
   * Load the audio to host for use
   */
  loadAudio(audios: AudioDefine[]): void;
  /**
   * Add subtitle to loaded audio
   */
  addSubtitleToAudio(audios: AdditionalSubtitleDefine[]): void;
  /**
   * Add audio files to audio station
   */
  addAudios(specs: AddAudioRequest[]): Promise<void>;
  /**
   * Play the audio
   */
  playAudio(id: string, resetProgress?: boolean): void;
  /**
   * Pause the audio
   */
  pauseAudio(id: string): void;
  /**
   * Stop the audio
   */
  stopAudio(id: string): void;
  /**
   * Seek to a position for audio
   */
  seekAudio(id: string, time: number): void;
  /**
   * Set Volume for audio
   */
  updateAudioVolume(id: string, volume?: number): number;
  /**
   * Fade Volume for audio
   */
  fadeAudio(
    id: string,
    startVolume: number,
    endVolume: number,
    duration: number
  ): void;
  /**
   * Make the audio loop or not
   */
  updateAudioLoop(id: string, loop?: boolean): boolean;
  // TODO: do we need more audio control method?

  // TODO: timeline API?

  // dialog area control
  /**
   * Open the dialog area
   */
  showDialogArea(): void;
  /**
   * Close the dialog area
   */
  hideDialogArea(): void;
  /**
   * Send message to dialog
   */
  sendDialogMessage(messages: DialogMessage[]): void;
  /**
   * Set usable actions in dialog area
   */
  setDialogActions(actions: DialogActions): void;
  /**
   * Unset usable actions in dialog area
   */
  clearDialogActions(): void;

  // progress and navigation
  /**
   * Jump to another episode
   */
  gotoEpisode(
    episode: string,
    forceReload?: boolean,
    assetOrder?: number,
    assetTime?: number
  ): void;

  // data persistent
  /**
   * Get persistent data for player
   */
  getPlayerData(slot: string): string | null;
  /**
   * Set persistent data for player
   */
  setPlayerData(slot: string, data: string): void;

  // pointer lock
  /**
   * Lock the pointer to content
   */
  lockMouse(): void;
  /**
   * Unlock the pointer to content
   */
  unlockMouse(): void;

  // fullscreen

  // player interaction block
  /**
   * Block user interaction on player elements
   */
  lockPlayer(): void;
  /**
   * Unblock user interaction on player elements
   */
  unlockPlayer(): void;

  // legacy input box layer
  requestTextFieldInput(definition: TextInputDefinition): void;

  // misc
  /**
   * Unblock user interaction on player elements
   */
  pointerMove(x: number, y: number): void;
  /**
   * `ManagedCoreState` related
   */
  getManagedCoreState(): Set<ManagedCoreState>;
  addManagedCoreState(state: ManagedCoreState<unknown>): void;
  deleteManagedCoreState(state: ManagedCoreState<unknown>): void;
  clearCoreState(): void;
  /**
   * Resource loader related
   */
  getResourceMetadata(query: string, type: 'label' | 'id'): IDetailedResourceItemForClient | null;
  getResourceUrl(
    query: string,
    searchBy: 'label' | 'id',
    resourceType?: 'group' | 'file',
    envConfig?: Record<string, string> | null
  ): string | null | Promise<string | null>;
  fetchResource(
    resourceId: string,
    cacheLevel: ResourceLoaderCacheLevel
  ): Blob | Promise<Blob>;
  getResourceList(): IResourceItemForClient[];
  /**
   * Trigger the queued task
   */
  requireQueuedTask(taskId: string): void;
  // Subsequence control
  createSequence(id: string, assets: IAssetForClient[]): void;
  startSequence(id: string): void;
  showSequence(id: string): void;
  hideSequence(id: string): void;
};

export interface DialogActionTriggerResponse {
  id: string;
  action: DialogAction;
}

export interface ContentFunctions {
  // check alive
  /**
   * Get a heartbeat signal from the content to check that the content is alive
   */
  requestHeartbeat(): void;
  // lifecycle
  /**
   * Should be called when the content will be visible
   */
  show(): void;
  /**
   * Should be called when the content will be hidden
   */
  hide(): void;
  /**
   * Should be called when the content will be destroyed
   */
  destroy(): void;

  // playback
  /**
   * Should be called when the content will be playing
   */
  play(): void;
  /**
   * Should be called when the content will be paused
   */
  pause(): void;
  /**
   * Should be called when the content will be seeked to a specific time
   */
  seek(time: number): void;

  // dialog area signal
  /**
   * Should be called when the dialog area was opened by user
   */
  dialogAreaOpened(): void;
  /**
   * Should be called when the dialog area was closed by user
   */
  dialogAreaClosed(): void;
  /**
   * Send a user input message to the content
   */
  dialogMessage(text: string): void;
  /**
   * User clicked dialog active
   */
  dialogActionTriggered(action: DialogActionTriggerResponse): void;
  // TODO: Message content?

  // legacy input box layer
  updateTextField(id: string, content: string): void;

  // misc
  /**
   * Update environment variables for content
   */
  updateEnvironment(env: Record<string, unknown>): void;
  /**
   * Update Resolution for content
   */
  updateResolution(x: number, y: number): void;
  /**
   * User finished payment action
   */
  finishPayment(type: string): void;
  /**
   * User closed the video modal
   */
  videoModalClosed(
    request:
    | ShowVideoModalUrlRequest
    | ShowVideoModalIdRequest
    | ShowVideoModalLabelRequest
  ): void;
  /**
   * Trigger the queued task
   */
  runQueuedTask(taskId: string): void;
  // Subsequence event
  sequenceEnded(id: string): void;
}
