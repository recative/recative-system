import * as React from 'react';
import type { EpisodeCore } from '@recative/core-manager';
import type { ContentSpec } from '@recative/definitions';

export type InterfaceExtensionComponent = React.FC<{
  core: EpisodeCore;
  loadingComponent?: React.FC;
}>;
export type AssetExtensionComponent = React.FC<{
  id: string;
  core: EpisodeCore;
  spec: ContentSpec;
  show: boolean;
  loadingComponent?: React.FC;
}>;
