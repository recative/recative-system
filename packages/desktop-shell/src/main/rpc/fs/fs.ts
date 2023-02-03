import path from 'path';
import os from 'os';
import url from 'url';
import fs from 'fs-extra';
import { dialog } from 'electron';
import { tmpDir } from '../../utils/tmpFile';

export interface WriteTempFileOptions {
  path: string;
  data: ArrayBuffer;
  recursive?: boolean;
}

export const WriteTempFile = async (options: WriteTempFileOptions) => {
  const fullPath = path.normalize(path.join(tmpDir, options.path));
  console.error('WriteTempFile', fullPath);
  if (options.recursive) {
    await fs.ensureDir(path.dirname(fullPath));
  }
  await fs.writeFile(fullPath, new Uint8Array(options.data));
  return fullPath;
};

export interface ShareBySaveFileOptions {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
}

export const ShareBySaveFile = async (options: ShareBySaveFileOptions) => {
  const fileUrl = options.url;
  if (fileUrl === undefined) {
    return;
  }
  const filePath = url.fileURLToPath(fileUrl);
  console.error('ShareBySaveFile from', filePath);
  const result = await dialog.showSaveDialog({
    title: options.dialogTitle,
    defaultPath: path.normalize(
      path.join(os.homedir(), path.basename(filePath))
    ),
    filters: [
      {
        name: path.extname(filePath),
        extensions: [path.extname(filePath)],
      },
    ],
  });
  if (result.canceled) {
    return;
  }
  const targetPath = result.filePath;
  if (targetPath === undefined) {
    return;
  }
  console.error('ShareBySaveFile to', filePath);
  await fs.move(filePath, targetPath);
};
