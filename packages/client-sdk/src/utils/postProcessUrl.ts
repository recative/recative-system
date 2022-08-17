import { BUNDLE_ID, PROFILE_ID, DATA_TYPE } from '../constant/storageKeys';

const bundleId = localStorage.getItem(BUNDLE_ID) ?? 'latest';
const profileId = localStorage.getItem(PROFILE_ID) ?? null;
const dataType = localStorage.getItem(DATA_TYPE) ?? 'uson';

export const postProcessUrl = (fileName: string, pathPattern: string) => {
  const url = new URL(
    pathPattern
      .replace('$fileName', fileName)
      .replace('$dataType', dataType),
    window.location.href
  );

  url.searchParams.set('bundleId', bundleId);
  if (profileId) {
    url.searchParams.set('profileId', profileId);
  }

  return url.toString();
};
