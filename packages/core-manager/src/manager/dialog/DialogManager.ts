import { nanoid } from 'nanoid';

import { atom, computed } from 'nanostores';

import type { ReadableAtom } from 'nanostores';

import { GroupType, Category } from '@recative/definitions';
import { getMatchedResource } from '@recative/smart-resource';

import type {
  DialogActions,
  DialogActionTriggerResponse,
  DialogMessage,
} from '@recative/act-protocol';
import type {
  IDetailedResourceItemForClient,
  IResourceFileForClient,
} from '@recative/definitions';
import type { OpenPromise } from '@recative/open-promise';

import type { IEnvVariable } from '../envVariable/EnvVariableManager';

import { isNotNullable } from '../../utils/isNullable';
import { selectUrl } from '../../utils/resource';
import {
  ComponentFunctions,
  SavedDialogMessageContent,
  InternalEpisodeData,
} from '../../types';

export interface IDialogMessageList {
  diff: SavedDialogMessageContent[];
  accumulated: SavedDialogMessageContent[];
}

export class DialogManager {
  readonly dialogVisible = atom(false);

  private internalDialogMessageList = atom({
    diff: [] as SavedDialogMessageContent[],
    accumulated: [] as SavedDialogMessageContent[],
  });

  readonly dialogMessageList = computed(
    this.internalDialogMessageList,
    (dialog) => dialog,
  );

  readonly dialogActions = atom<DialogActions | null>(null);

  constructor(
    private components: Map<string, Partial<ComponentFunctions>>,
    private episodeData: OpenPromise<InternalEpisodeData>,
    private ensureNotDestroyed: () => void,
    private envVariable: ReadableAtom<IEnvVariable>,
  ) {}

  readonly triggerDialogAction = (action: DialogActionTriggerResponse) => {
    this.components.forEach((component) => {
      component.handleDialogActionTrigger?.(action);
    });
  };

  sendDialogMessage = async (_messages: DialogMessage[]) => {
    this.ensureNotDestroyed();

    const episodeData = await this.episodeData;
    const messages: DialogMessage[] = [];

    for (let i = 0; i < _messages.length; i += 1) {
      const message = _messages[i];

      if (message.type === 'resource') {
        let resource: IDetailedResourceItemForClient | undefined;
        if ('id' in message) {
          resource = episodeData.resources.itemsById.get(message.id);
        } else if ('label' in message) {
          resource = episodeData.resources.itemsByLabel.get(message.label);
        }

        if (!resource) {
          throw new Error(`Resource not found: ${JSON.stringify(message)}`);
        }

        const resourceTagSet = new Set(resource.tags);
        let resourceFile: IResourceFileForClient | undefined;
        if (resource.type === 'group') {
          // Resource is a group
          if (resourceTagSet.has(GroupType.Texture)) {
            // Select a texture from the group
            const resourceEntries = resource.files
              .map((x) => {
                const item = episodeData.resources.filesById.get(x.id);
                if (!item) return null;
                return {
                  selector: item.tags,
                  item,
                };
              })
              .filter(isNotNullable);
            resourceFile = getMatchedResource(
              resourceEntries,
              // eslint-disable-next-line no-underscore-dangle
              this.envVariable.get().__smartResourceConfig,
              { lang: 10, device: 1, screen: 1 },
            );
          } else {
            throw new Error('Invalid group type');
          }
        } else {
          // Resource is a file
          if (resourceTagSet.has(Category.Image)) {
            resourceFile = resource;
          }
          throw new Error('Invalid resource file type');
        }

        if (!resourceFile) {
          throw new Error('Resource file not found');
        }

        const url = selectUrl(resourceFile.url, episodeData.preferredUploaders).next().value;

        if (!url) {
          throw new Error('No resource URL found');
        }

        messages.push({
          type: 'image',
          direction: message.direction,
          src: url[0],
        });
      } else {
        messages.push(message);
      }
    }

    const savedMessage = messages.map((message) => ({
      ...message,
      id: nanoid(),
    }));
    const dialogMessageList = this.dialogMessageList.get().accumulated;
    this.internalDialogMessageList.set({
      diff: savedMessage,
      accumulated: dialogMessageList.concat(savedMessage),
    });
  };
}
