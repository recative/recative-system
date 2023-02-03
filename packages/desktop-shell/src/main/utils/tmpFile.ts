import path from 'path';
import os from 'os';
import fs from 'fs-extra';

export const tmpDir = fs.mkdtempSync(
  path.resolve(os.tmpdir(), 'recative-desktop-shell-')
);
