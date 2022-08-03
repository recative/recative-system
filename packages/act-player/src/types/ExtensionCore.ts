import * as React from 'react';
import type { Core } from '@recative/core-manager';
import type { ContentSpec } from '@recative/definitions';

export type InterfaceExtensionComponent = React.FC<{
  core: Core;
  loadingComponent?: React.FC;
}>;
export type AssetExtensionComponent = React.FC<{
  id: string;
  core: Core;
  spec: ContentSpec;
  show: boolean;
  loadingComponent?: React.FC;
}>;
