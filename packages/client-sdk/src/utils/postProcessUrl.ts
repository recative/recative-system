const bundleId = localStorage.getItem('@recative/client-sdk/bundle-id') ?? 'latest';
const profileId = localStorage.getItem('@recative/client-sdk/studio-profile-id') ?? null;

export const postProcessUrl = (fileName: string, pathPattern: string) => {
  const url = new URL(pathPattern.replace('$fileName', fileName), window.location.href);
  url.searchParams.set('bundleId', bundleId);
  if (profileId) {
    url.searchParams.set('profileId', profileId);
  }

  return url.toString();
};
