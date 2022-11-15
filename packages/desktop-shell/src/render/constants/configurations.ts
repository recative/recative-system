import { DATA_TYPE, PATH, PREFERRED_UPLOADERS } from './storageKeys';

export const temporaryPath = localStorage.getItem(PATH);
export const temporaryDataType = localStorage.getItem(DATA_TYPE) as
  | 'bson'
  | 'json'
  | 'uson';

export const pathPattern = temporaryPath ?? '/bundle/data/$fileName';
export const dataType = temporaryDataType ?? 'uson';

const temporaryUploader = localStorage.getItem(
  PREFERRED_UPLOADERS,
);

export const preferredUploaders = temporaryUploader
  ? temporaryUploader.split(',')
  : [
    '@recative/uploader-extension-mobile-shell/cached',
    '@recative/uploader-extension-mobile-shell/build-in',
    '@recative/uploader-extension-s3-oss/S3Uploader',
  ];

export const trustedUploaders = ['@recative/uploader-extension-mobile-shell/build-in'];
