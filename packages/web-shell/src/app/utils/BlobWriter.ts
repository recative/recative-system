/**
 * A minimal utility used to download content of a blob
 * compatible with implementation in capacitor-blob-writer.
 */
export const blobWriter = {
  default: (option: { path: string; blob: Blob }) => {
    const link = document.createElement('a');
    link.style.display = 'none';
    document.body.appendChild(link);

    const objectURL = URL.createObjectURL(option.blob);
    link.href = objectURL;
    link.href = URL.createObjectURL(option.blob);
    link.download = option.path;
    link.click();
  },
};
