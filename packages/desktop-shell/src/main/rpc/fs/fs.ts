import path from 'path';
import os from 'os';
import fs from 'fs-extra';

export interface WriteTempFileOptions {
  path: string;
  data: ArrayBuffer;
  recursive?: boolean;
}

const tmpDir = fs.mkdtempSync(
  path.resolve(os.tmpdir(), 'recative-desktop-shell-')
);

export const WriteTempFile = async (options: WriteTempFileOptions) => {
  const fullPath = path.normalize(path.join(tmpDir, options.path));
  console.error('WriteTempFile', fullPath);
  if (options.recursive) {
    await fs.ensureDir(path.dirname(fullPath));
  }
  await fs.writeFile(fullPath, new Uint8Array(options.data));
  return fullPath;
};
