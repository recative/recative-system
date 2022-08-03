export interface ISimpleRelease {
  readonly id: number;
  committer: string;
  commitTime: number;
  notes: string;
}

export interface IBundleRelease {
  readonly id: number;
  readonly codeBuildId: number;
  readonly mediaBuildId: number;
  committer: string;
  commitTime: number;
  notes: string;
}

export interface ISeriesMetadata {
  readonly id: string;
  title: Record<string, string>;
  description: Record<string, string>;
  loadingCoverForCatalogPageResourceId: string;
  loadingCoverForMainContentsResourceId: string;
}
