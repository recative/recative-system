import { getMatchedResource } from '@recative/smart-resource';
import type { ResourceEntry } from '@recative/smart-resource';
import type {
  IResourceItemForClient,
  IDetailedResourceItemForClient,
} from '@recative/definitions';

import { useHostFunctions } from './hostFunctionsHooks';
import { defaultQueryFn, useQuery } from './fetchDataHooks';
import { useEnvVariableDataSource } from './envVariableHooks';

import { Subscribable } from '../types/dataSource';
import { useSelector, useCombinator, DataSource } from '../core/DataSource';
import type { IEnvVariable } from '../core/protocol';

export class ResourceNotFoundError extends Error {
  name = 'ResourceNotFound';

  constructor(label: string) {
    super(
      `The resource with label: '${label}' was not found from resource manager.`,
    );
  }
}

export class NoMatchedResourceError extends Error {
  name = 'NoMatchedResource';

  constructor(
    label: string,
    public config: ResourceEntry<string>[] | null = null,
    public metadata: IResourceItemForClient | IDetailedResourceItemForClient | null = null,
    public envVariable: IEnvVariable | null = null,
  ) {
    super(`No matched resource was found for '${label}'.`);
  }
}

const DEFAULT_TAG_DATA_SOURCE = new DataSource('unknown');

export const DefaultTagDataSource = DEFAULT_TAG_DATA_SOURCE.subscribe;

const getFileUrl = (
  fileId: string,
  suffix: string,
) => `${window.location.protocol}//id.binary.resource-manager/${fileId}?ext=.${suffix}`;

export const useResourceManagerResourceDataSourceFallbackMode = (
  label: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _suffix = 'png',
  tagDataSource: Subscribable<string> = DEFAULT_TAG_DATA_SOURCE.subscribe,
) => {
  const { connector } = useHostFunctions();

  const textureDataSource = useSelector(
    tagDataSource,
    async (tag) => {
      const url = await connector.getResourceUrl(label, 'label', undefined, { custom: tag || '' });
      if (!url) {
        throw new NoMatchedResourceError(label, null);
      }

      return url;
    },
  );

  return textureDataSource;
};

const ANY_SELECTOR = ['*'];
const EMPTY_STRING_ARRAY: string[] = [];

export const useResourceManagerResourceDataSourceNormalMode = (
  label: string,
  suffix = 'png',
  tagDataSource: Subscribable<string> = DEFAULT_TAG_DATA_SOURCE.subscribe,
) => {
  const envVariableDataSource = useEnvVariableDataSource();

  const { subscribeResultUpdate: metadataDataSource } = useQuery<
  string | null, IDetailedResourceItemForClient | null
  >(new DataSource(`${window.location.protocol}//label.metadata.resource-manager/${label}`).subscribe);

  const combinedDataSource = useCombinator(
    envVariableDataSource,
    metadataDataSource,
    tagDataSource,
  );

  const textureDataSource = useSelector(
    combinedDataSource,
    ([envVariable, metadataResponse, tag]) => {
      if (!metadataResponse?.success) return null;
      const metadata = metadataResponse.data;
      if (!metadata) return null;
      if (!('type' in metadata)) {
        throw new ResourceNotFoundError(label);
      }

      if (!envVariable) return null;

      const config: ResourceEntry<string>[] = metadata.type === 'file'
        ? [{
          selector: ANY_SELECTOR,
          item: getFileUrl(metadata.id, suffix),
        }]
        : metadata.files?.map((file) => ({
          selector: file.tags,
          item: getFileUrl(file.id, suffix),
        })) ?? EMPTY_STRING_ARRAY;

      const result = getMatchedResource(
        config,
        {
          ...envVariable.__smartResourceConfig,
          custom: tag || 'unknown',
        },
      );

      if (!result) {
        throw new NoMatchedResourceError(label, config, metadata, envVariable);
      }

      return result;
    },
  );

  return textureDataSource;
};

const normalModeAvailable = 'serviceWorker' in navigator && navigator.serviceWorker.controller;

export const useResourceManagerResourceDataSource = normalModeAvailable
  ? useResourceManagerResourceDataSourceNormalMode
  : useResourceManagerResourceDataSourceFallbackMode;

export const useResourceMetadataByLabelFetcherNormalMode = () => async (
  label: string | null,
) => defaultQueryFn<string, IDetailedResourceItemForClient | null>(
  `${window.location.protocol}//label.metadata.resource-manager/${label}`,
);

export const useResourceMetadataByLabelFetcherFallbackMode = () => {
  const { connector } = useHostFunctions();
  return async (label: string | null) => {
    if (label !== null) {
      return connector.getResourceMetadata(label, 'label');
    }
    return null;
  };
};

export const useResourceMetadataByLabelFetcher = normalModeAvailable
  ? useResourceMetadataByLabelFetcherNormalMode
  : useResourceMetadataByLabelFetcherFallbackMode;

export const useResourceMetadataByIdFetcherNormalMode = () => async (
  id: string | null,
) => defaultQueryFn<string, IDetailedResourceItemForClient | null>(
  `${window.location.protocol}//id.metadata.resource-manager/${id}`,
);

export const useResourceMetadataByIdFetcherFallbackMode = () => {
  const { connector } = useHostFunctions();
  return async (id: string | null) => {
    if (id !== null) {
      return connector.getResourceMetadata(id, 'id');
    }
    return null;
  };
};

export const useResourceMetadataByIdFetcher = normalModeAvailable
  ? useResourceMetadataByIdFetcherNormalMode
  : useResourceMetadataByIdFetcherFallbackMode;

export const useResourceUrlByIdFetcherNormalMode = () => async (
  id: string | null,
  suffix = 'png',
) => {
  if (id !== null) {
    return getFileUrl(id, suffix);
  }
  return null;
};
export const useResourceUrlByIdFetcherFallbackMode = () => {
  const { connector } = useHostFunctions();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return async (id: string | null, _suffix = 'png') => {
    if (id !== null) {
      return connector.getResourceUrl(id, 'id');
    }
    return null;
  };
};

export const useResourceUrlByIdFetcher = normalModeAvailable
  ? useResourceUrlByIdFetcherNormalMode
  : useResourceUrlByIdFetcherFallbackMode;
