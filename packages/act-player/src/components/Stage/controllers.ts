import { atom, computed } from 'nanostores';

import type { ComponentFunctions } from '@recative/core-manager';
import type { ContentSpec } from '@recative/definitions';

interface AssetExtraData {
  order: number;
}

type AssetMetadata = (ContentSpec & AssetExtraData & { instanceId: string })[];

export const getController = () => {
  const assetMetadataAtom = atom<AssetMetadata>([]);
  const assetShowAtom = atom<Record<string, boolean | undefined>>({});
  const stageContentsAtom = computed([assetMetadataAtom], (assetsMetadata) => assetsMetadata
    .map(({ instanceId, ...spec }) => ({ id: instanceId, spec }))
    .filter((x) => !!x.spec)
    .sort((a, b) => a.spec!.order - b.spec!.order));

  let lastOrderId = 0;

  const controller: Partial<ComponentFunctions> = {
    createContent(id, spec) {
      lastOrderId += 1;
      assetMetadataAtom.set([
        ...assetMetadataAtom.get(),
        { ...spec, order: lastOrderId, instanceId: id },
      ]);
    },
    showContent(id) {
      assetShowAtom.set({ ...assetShowAtom.get(), [id]: true });
    },
    hideContent(id) {
      assetShowAtom.set({ ...assetShowAtom.get(), [id]: false });
    },
    destroyContent(id) {
      assetMetadataAtom.set(
        assetMetadataAtom.get().filter((x) => x.instanceId !== id),
      );
      assetShowAtom.set({
        ...assetShowAtom.get(),
        [id]: undefined,
      });
    },
  };

  return {
    controller,
    assetMetadataAtom,
    assetShowAtom,
    stageContentsAtom,
  };
};
