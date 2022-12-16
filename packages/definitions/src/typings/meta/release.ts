/**
 * Represents a media or code release release.
 */
export interface ISimpleRelease {
  /**
   * The unique identifier for the release.
   */
  readonly id: number;

  /**
   * The name of the committer who created the release.
   */
  committer: string;

  /**
   * The timestamp for when the release was created.
   */
  commitTime: number;

  /**
   * Whether the release has been deprecated.
   */
  deprecated: boolean;

  /**
   * Notes associated with the release.
   */
  notes: string;
}

/**
 * Represents a release that includes both code and media.
 */
export interface IBundleRelease {
  /**
   * The unique identifier for the release.
   */
  readonly id: number;

  /**
   * The unique identifier for the code build associated with the release.
   */
  readonly codeBuildId: number;

  /**
   * The unique identifier for the media build associated with the release.
   */
  readonly mediaBuildId: number;

  /**
   * The name of the committer who created the release.
   */
  committer: string;

  /**
   * The timestamp for when the release was created.
   */
  commitTime: number;

  /**
   * Whether the release has been deprecated.
   */
  deprecated: boolean;

  /**
   * Notes associated with the release.
   */
  notes: string;
}

export interface ISeriesMetadata {
  readonly id: string;
  title: Record<string, string>;
  description: Record<string, string>;
  deprecated: boolean;
  loadingCoverForCatalogPageResourceId: string;
  loadingCoverForMainContentsResourceId: string;
}
