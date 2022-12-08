import { ManagerCoreStateTrigger } from '../client/managedCoreState';

export interface IAsset {
  /**
   * A unique identifier for the asset.
   */
  id: string;

  /**
   * A string or an array of strings that represents tags or keywords associated
   * with the asset.
   */
  tags?: string | string[];

  /**
   * The unique identifier of the content extension used for this asset.
   * Possible values are:
   *
   * - `@recative/content-extension-video`: A video with splitted audio channel
   *   file and video file.
   * - `@recative/content-extension-act-point`: An embedded web application that
   *   adapted the [act protocol](https://github.com/recative/recative-system/tree/master/packages/act-protocol).
   *
   * Developers could find the [implementation of different components](https://github.com/recative/recative-system/blob/master/packages/act-player/src/components/Stage/Stage.tsx#L19-L22)
   * here.
   */
  contentExtensionId: string;

  /**
   * The unique identifier of the content to which the asset belongs.
   *
   * - For video files, the `contentId` is the id of the [resource file](/api/definitions/interface/IResourceFile).
   * - For act points, the `contentId` is the [`fullPath`](/api/definitions/interface/IActPoint#fullPath).
   */
  contentId: string;

  /**
   * The order in which the asset should be presented or played.
   */
  order: number;

  /**
   * Whether preloading of the asset is disabled or not.
   */
  preloadDisabled: boolean;

  /**
   * Whether the asset should be destroyed as soon as it is no longer active.
   */
  earlyDestroyOnSwitch: boolean;

  /**
   * The unique identifier of the episode to which the asset belongs.
   */
  episodeId: string;

  /**
   * Notes or comments about the asset, this value is not used in any code, only
   * for developers.
   */
  notes: string;

  /**
   * The timestamp when the asset was created.
   */
  createTime: number;

  /**
   * The timestamp when the asset was last updated.
   */
  updateTime: number;

  /**
   * An array of `ManagerCoreStateTrigger` objects that represent different
   * events that can trigger changes while playing the asset.
   */
  triggers?: ManagerCoreStateTrigger[];

  /**
   * A record that contains configurations specific to the content extension
   * used for this asset, where the keys are the names of the configuration
   * options and the values are the corresponding values for those options,
   * the value must be string.
   *
   * For video files, possible values are:
   * - OBJECT_FIT: The [object-fit CSS propriety](https://developer.mozilla.org/en-US/docs/Web/CSS/object-fit)
   *   that will be injected to the video element.
   */
  extensionConfigurations: Record<string, string>;
}
