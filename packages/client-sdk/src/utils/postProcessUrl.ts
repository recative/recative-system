import {
  BUNDLE_ID,
  PROFILE_ID,
  DATA_TYPE,
  DISABLE_REQUEST_EXTENSION_NAME,
} from '../constant/storageKeys';

const bundleId = localStorage.getItem(BUNDLE_ID) ?? 'latest';
const profileId = localStorage.getItem(PROFILE_ID) ?? null;
const initialDataType = localStorage.getItem(DATA_TYPE) ?? 'uson';
const initialDisableRequestExtensionName = !!localStorage.getItem(
  DISABLE_REQUEST_EXTENSION_NAME,
) ?? false;

export const postProcessUrl = (
  fileName: string,
  pathPattern: string,
  dataType = initialDataType,
  disableRequestExtensionName = initialDisableRequestExtensionName,
) => {
  const internalFileName = disableRequestExtensionName ? fileName : `${fileName}.${dataType}`;
  const url = new URL(
    pathPattern
      .replace('$fileName', internalFileName)
      .replace('$dataType', dataType),
    window.location.href,
  );

  url.searchParams.set('bundleId', bundleId);
  if (profileId) {
    url.searchParams.set('profileId', profileId);
  }

  return url.toString();
};
