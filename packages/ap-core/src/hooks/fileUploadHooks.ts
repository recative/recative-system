import { AtomDefinition } from '../core/AtomStore';

import { useStore, useResourceTracker } from './baseHooks';

export const useUploader = () => {
  const resourceTracker = useResourceTracker();
  const fileAtom = AtomDefinition<File | null>(null);
  const [, setFile, subscribeFileUpdate] = useStore(fileAtom);

  const $uploader = window.document.createElement('INPUT') as HTMLInputElement;
  $uploader.setAttribute('type', 'file');

  const upload = () => {
    // If user agent contains "CloudGamingFeaturePolicy/enabled", it means we are running
    // on cloud gaming mode, so we should disable file uploading feature, and show a message.
    if (window.navigator.userAgent.includes('CloudGamingFeaturePolicy/enabled')) {
      alert('File uploading is not supported on this mode.');
      return;
    }

    $uploader.click();
  };

  const handleChange = () => {
    const { files } = $uploader;
    if (!files) return;

    const file = files[0];
    if (!file) return;

    setFile(file);

    $uploader.value = '';
  };

  $uploader.addEventListener('change', handleChange);

  resourceTracker.track({
    dispose: () => {
      $uploader.removeEventListener('change', handleChange);
    },
  });

  return [upload, subscribeFileUpdate] as const;
};
