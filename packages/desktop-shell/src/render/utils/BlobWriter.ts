import { server } from '../channel';

export const blobWriter = {
  default: async (option: {
    path: string;
    blob: Blob;
    recursive?: boolean;
  }) => {
    const data = await option.blob.arrayBuffer();
    return await server.WriteTempFile({
      path: option.path,
      data,
      recursive: option.recursive,
    });
  },
};
